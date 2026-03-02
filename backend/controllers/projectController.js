import Project from '../models/Project.js'
import ProjectPhase from '../models/ProjectPhase.js'
import ProjectActivity from '../models/ProjectActivity.js'
import AIPreview from '../models/AIPreview.js'
import vertexAIService from '../services/vertexAI/index.js'
import { getPhasesForProjectType } from '../utils/phaseTemplates.js'
import { logProjectActivity } from '../utils/activityLogger.js'
import { getPhasesFromAIAnalysis, extractClientQuestionsFromPreview } from '../utils/aiAnalysisPhases.js'
import { getProjectDurationFromDates } from '../utils/projectDuration.js'
import { normalizePreviewMetadata, injectGeneratedImages } from '../services/vertexAI/responseParser.js'
import { getSignedUrlsForPaths } from '../utils/gcsImageStorage.js'
import { calculatePhaseDuration, checkClientApprovalRequired, getDefaultQuestionsForPhase } from '../utils/phaseWorkflow.js'
import { generateSubStepTodos } from '../utils/subStepTodoGenerator.js'
import { createNotification } from './notificationController.js'
import asyncHandler from 'express-async-handler'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/phases')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
})

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
export const createProject = asyncHandler(async (req, res) => {
  const projectData = {
    ...req.body,
    clientId: req.user._id,
    status: 'Holding',
    teamClosed: true,
  }

  const project = await Project.create(projectData)

  await logProjectActivity(project._id, req.user._id, 'project.created', 'project', project._id, { title: project.title })

  const populated = await Project.findById(project._id)
    .populate('clientId', 'name email')
    .populate('assignedProgrammerId', 'name email skills bio hourlyRate')

  res.status(201).json(populated)
})

/** Allowed project types and technologies for AI response normalization */
const PROJECT_TYPE_ENUM = [
  'New Website Design & Development',
  'Website Redesign/Refresh',
  'E-commerce Store',
  'Management Panel / ERP / CRM',
  'Landing Page',
  'Web Application',
  'Maintenance/Updates to Existing Site',
  'Other',
]
const ALLOWED_TECH_VALUES = ['React', 'Angular', 'Node.js', 'Express', 'MongoDB', 'PostgreSQL', 'TypeScript', 'Next.js', 'Tailwind CSS']

function normalizeProjectRequirements(parsed) {
  const techStack = parsed.techStack || {}
  const flatTech = []
  for (const key of ['frontend', 'backend', 'database', 'deployment', 'other']) {
    const arr = techStack[key]
    if (Array.isArray(arr)) {
      for (const t of arr) {
        const val = (typeof t === 'string' ? t : String(t)).trim().toLowerCase()
        for (const allowed of ALLOWED_TECH_VALUES) {
          if (val.includes(allowed.toLowerCase()) || val === allowed.toLowerCase()) {
            if (!flatTech.includes(allowed)) flatTech.push(allowed)
            break
          }
        }
      }
    }
  }
  const toArr = (v) => (Array.isArray(v) ? v : typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : [])
  const projectType = PROJECT_TYPE_ENUM.includes(parsed.projectType) ? parsed.projectType : 'Other'
  const budget = parsed.budget != null ? String(parsed.budget) : null
  const timeline = parsed.timeline != null ? String(parsed.timeline) : (parsed.timeline?.totalWeeks != null ? String(parsed.timeline.totalWeeks) : null)
  return {
    title: parsed.title || 'Untitled Project',
    description: parsed.description || parsed.overview || parsed.analysisExtras?.overview || '',
    projectType,
    budget,
    timeline,
    goals: toArr(parsed.goals),
    features: toArr(parsed.features),
    designStyles: toArr(parsed.designStyles),
    technologies: flatTech.length ? flatTech : ['React', 'Node.js', 'MongoDB'],
    hasBranding: ['Yes', 'No', 'Partial'].includes(parsed.hasBranding) ? parsed.hasBranding : null,
    brandingDetails: parsed.brandingDetails || null,
    contentStatus: parsed.contentStatus || null,
    referenceWebsites: parsed.referenceWebsites || null,
    specialRequirements: parsed.specialRequirements || null,
    additionalComments: parsed.additionalComments || null,
  }
}

// @desc    Generate project requirements from AI (for CreateProject form pre-fill)
// @route   POST /api/projects/generate-requirements
// @access  Private
export const generateProjectRequirements = asyncHandler(async (req, res) => {
  const { prompt } = req.body
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400)
    throw new Error('Please provide a prompt describing your project')
  }
  const { result, fromCache, usage } = await vertexAIService.generateProjectRequirements(prompt.trim())
  const projectData = normalizeProjectRequirements(result)
  const analysisExtras = result.analysisExtras || null
  res.status(200).json({ projectData, analysisExtras, fromCache: fromCache === true })
})

// @desc    Get all projects (filtered by user role)
// @route   GET /api/projects
// @access  Private
export const getProjects = asyncHandler(async (req, res) => {
  const filter = {}

  if (req.user.role === 'user') {
    filter.clientId = req.user._id
  } else if (req.user.role === 'programmer') {
    filter.$or = [
      { assignedProgrammerId: req.user._id },
      { assignedProgrammerIds: req.user._id },
      { status: 'Open' },
    ]
  }

  const projects = await Project.find(filter)
    .populate('clientId', 'name email')
    .populate('assignedProgrammerId', 'name email skills bio hourlyRate')
    .sort({ createdAt: -1 })

  res.json(projects)
})

// @desc    Get current user's projects
// @route   GET /api/projects/my-projects
// @access  Private
export const getMyProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find({ clientId: req.user._id })
    .populate('clientId', 'name email')
    .populate('assignedProgrammerId', 'name email skills bio hourlyRate')
    .sort({ createdAt: -1 })

  res.json(projects)
})

// @desc    Get projects assigned to current programmer
// @route   GET /api/projects/assigned
// @access  Private/Programmer
export const getAssignedProjects = asyncHandler(async (req, res) => {
  if (req.user.role !== 'programmer' && req.user.role !== 'admin') {
    res.status(403)
    throw new Error('Not authorized to access assigned projects')
  }

  const projects = await Project.find({
    $or: [
      { assignedProgrammerId: req.user._id },
      { assignedProgrammerIds: req.user._id },
    ],
  })
    .populate('clientId', 'name email')
    .populate('assignedProgrammerId', 'name email skills bio hourlyRate')
    .populate('assignedProgrammerIds', 'name email')
    .sort({ createdAt: -1 })

  res.json(projects)
})

// @desc    Get project by ID
// @route   GET /api/projects/:id
// @access  Private
export const getProjectById = asyncHandler(async (req, res) => {
  let project = await Project.findById(req.params.id)
    .populate('clientId', 'name email company status')
    .populate('assignedProgrammerId', 'name email skills bio hourlyRate status')
    .populate('assignedProgrammerIds', 'name email skills bio hourlyRate status')
    .lean()

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  let phases = await ProjectPhase.find({ projectId: project._id })
    .populate('subSteps.assignedTo', 'name email avatar')
    .sort({ order: 1 })
    .lean()

  for (const phase of phases) {
    if (!phase.subSteps || phase.subSteps.length === 0) {
      const doc = await ProjectPhase.findById(phase._id)

      if (doc && (!doc.subSteps || doc.subSteps.length === 0)) {
        doc.subSteps = [{
          title: doc.title,
          completed: false,
          order: 1,
          notes: '',
          status: 'pending',
        }]

        await doc.save()
      }
    }
  }

  phases = await ProjectPhase.find({ projectId: project._id })
    .populate('subSteps.assignedTo', 'name email avatar')
    .sort({ order: 1 })
    .lean()

  const previewCount = await AIPreview.countDocuments({
    projectId: project._id,
    status: 'completed'
  })

  res.json({ ...project, phases, previewCount })
})

const normalizePhaseProposal = (proposal) =>
  (Array.isArray(proposal) ? proposal : []).map((d) => ({
    title: d.title ?? '',
    description: d.description ?? null,
    order: typeof d.order === 'number' ? d.order : 0,
    deliverables: Array.isArray(d.deliverables) ? d.deliverables : [],
    weeks: d.weeks ?? null,
    dueDate: d.dueDate ?? null,
    subSteps: Array.isArray(d.subSteps)
      ? d.subSteps.map((s, i) => ({
          title: typeof s.title === 'string' ? s.title.trim() : '',
          order: typeof s.order === 'number' ? s.order : i + 1,
          todos: Array.isArray(s.todos)
            ? s.todos
                .map((t, k) => ({ text: t.text ?? '', completed: false, order: k + 1 }))
                .filter((t) => (t.text || '').trim())
                .map((t, k) => ({ ...t, order: k + 1 }))
            : [],
        }))
      : [],
  }))

const ensureProgrammerOrAdminForProposal = (project, user) => {
  const assignedId = project.assignedProgrammerId?.toString?.()
  const assignedIds = (project.assignedProgrammerIds || []).map((id) => id?.toString())
  const userId = user._id.toString()
  const isProgrammer = assignedId === userId || assignedIds.includes(userId)
  if (user.role !== 'admin' && !isProgrammer) {
    throw new Error('Only the assigned programmer or admin can modify the phase proposal')
  }
}

// @desc    Get proposed timeline (from stored, AI, or template). No phases created.
// @route   GET /api/projects/:id/phases/proposal
// @access  Private (project access)
export const getPhaseProposal = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  const existingCount = await ProjectPhase.countDocuments({ projectId: project._id })
  if (existingCount > 0) {
    res.status(400)
    throw new Error('Project already has phases')
  }

  const projectLean = project.toObject?.() ?? project
  const preview = await AIPreview.findOne({
    projectId: project._id,
    status: 'completed',
  })
    .sort({ createdAt: -1 })
    .select('previewResult metadata')
    .lean()

  let proposal
  const hasRichProposal = (arr) =>
    Array.isArray(arr) && arr.length > 0 && arr.some((p) => (p.subSteps?.length ?? 0) > 0)

  if (Array.isArray(project.phaseProposal) && project.phaseProposal.length > 0 && hasRichProposal(project.phaseProposal)) {
    return res.json(normalizePhaseProposal(project.phaseProposal))
  }

  try {
    proposal = await vertexAIService.generateWorkspaceProposal(projectLean, preview ?? null)
  } catch (err) {
    console.warn('[getPhaseProposal] AI generation failed, falling back to analysis:', err.message)
    const definitions = await getPhasesFromAIAnalysis(project._id)
    if (definitions?.length) {
      proposal = definitions.map((d) => ({
        title: d.title,
        description: d.description ?? null,
        order: d.order,
        deliverables: Array.isArray(d.deliverables) ? d.deliverables : [],
        weeks: d.weeks ?? null,
        subSteps: Array.isArray(d.subSteps) ? d.subSteps : [],
      }))
    } else {
      proposal = await vertexAIService.generateWorkspaceProposal(projectLean, null)
    }
  }

  if (!hasRichProposal(proposal)) {
    try {
      proposal = await vertexAIService.generateWorkspaceProposal(projectLean, null)
    } catch {
      const template = getPhasesForProjectType(project.projectType)
      proposal = template.map((d) => ({
        title: d.title,
        description: d.description ?? null,
        order: d.order,
        deliverables: d.deliverables ?? [],
        weeks: d.weeks ?? null,
        subSteps: [],
      }))
    }
  }

  const normalized = normalizePhaseProposal(proposal)
  project.phaseProposal = normalized
  await project.save()

  res.json(normalized)
})

// @desc    Save phase proposal (draft). Programmer or admin only.
// @route   PATCH /api/projects/:id/phases/proposal
// @access  Private (assigned programmer or admin)
export const savePhaseProposal = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  ensureProgrammerOrAdminForProposal(project, req.user)

  const existingCount = await ProjectPhase.countDocuments({ projectId: project._id })
  if (existingCount > 0) {
    res.status(400)
    throw new Error('Project already has phases')
  }

  const proposal = req.body?.proposal ?? req.body
  if (!Array.isArray(proposal)) {
    res.status(400)
    throw new Error('Request body must include proposal array')
  }

  const normalized = normalizePhaseProposal(proposal)
  project.phaseProposal = normalized
  await project.save()

  res.json(normalized)
})

// @desc    Regenerate phase proposal from AI. Programmer or admin only.
// @route   POST /api/projects/:id/phases/proposal/regenerate
// @access  Private (assigned programmer or admin)
export const regeneratePhaseProposal = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  ensureProgrammerOrAdminForProposal(project, req.user)

  const existingCount = await ProjectPhase.countDocuments({ projectId: project._id })
  if (existingCount > 0) {
    res.status(400)
    throw new Error('Project already has phases')
  }

  const projectLean = project.toObject?.() ?? project
  const preview = await AIPreview.findOne({
    projectId: project._id,
    status: 'completed',
  })
    .sort({ createdAt: -1 })
    .select('previewResult metadata')
    .lean()

  const currentProposal = req.body?.currentProposal ?? req.body?.proposal
  const hasRichProposal = (arr) =>
    Array.isArray(arr) && arr.length > 0 && arr.some((p) => (p.subSteps?.length ?? 0) > 0)
  const needsExpand = Array.isArray(currentProposal) && currentProposal.length > 0 && !hasRichProposal(currentProposal)

  let proposal
  if (needsExpand) {
    const { expandPhasesWithSubSteps } = await import('../utils/phaseProposalExpander.js')
    proposal = expandPhasesWithSubSteps(currentProposal, projectLean)
  } else {
    try {
      proposal = await vertexAIService.generateWorkspaceProposal(projectLean, preview ?? null)
    } catch (err) {
      console.warn('[regeneratePhaseProposal] AI generation failed:', err.message)
      try {
        proposal = await vertexAIService.generateWorkspaceProposal(projectLean, null)
      } catch {
        const template = getPhasesForProjectType(project.projectType)
        proposal = template.map((d) => ({
          title: d.title,
          description: d.description ?? null,
          order: d.order,
          deliverables: d.deliverables ?? [],
          weeks: d.weeks ?? null,
          subSteps: [],
        }))
      }
    }
  }

  const normalized = normalizePhaseProposal(proposal)
  project.phaseProposal = normalized
  await project.save()

  res.json(normalized)
})

// @desc    Confirm timeline: create phases from (possibly edited) proposal. Programmer or admin only.
// @route   POST /api/projects/:id/phases/confirm
// @access  Private (assigned programmer or admin)
export const confirmPhases = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  const assignedId = project.assignedProgrammerId?.toString?.()
  const assignedIds = (project.assignedProgrammerIds || []).map((id) => id?.toString())
  const userId = req.user._id.toString()
  const isProgrammer = assignedId === userId || assignedIds.includes(userId)
  if (req.user.role !== 'admin' && !isProgrammer) {
    res.status(403)
    throw new Error('Only the assigned programmer or admin can confirm the timeline')
  }

  const existingCount = await ProjectPhase.countDocuments({ projectId: project._id })
  if (existingCount > 0) {
    res.status(400)
    throw new Error('Project already has phases. Timeline can only be confirmed once.')
  }

  const definitions = req.body
  if (!Array.isArray(definitions) || definitions.length === 0) {
    res.status(400)
    throw new Error('Request body must be an array of phase definitions (title, description, order, deliverables?, subSteps?)')
  }

  const sortedDefs = [...definitions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const timelineWeeks = Math.max(1, parseInt(project.timeline, 10) || 8)

  const dateDuration = getProjectDurationFromDates(project)
  const totalDaysFromDates = dateDuration?.totalDays ?? null
  const totalDays = totalDaysFromDates ?? timelineWeeks * 7

  // Resolve effective project start
  let projectStart
  if (project.startDate) {
    projectStart = new Date(project.startDate)
  } else if (project.dueDate && project.timeline) {
    projectStart = new Date(project.dueDate)
    projectStart.setDate(projectStart.getDate() - totalDays)
    project.startDate = projectStart
  } else {
    projectStart = new Date()
  }

  // Resolve effective project end
  const projectEnd = project.dueDate
    ? new Date(project.dueDate)
    : (() => {
        const end = new Date(projectStart)
        end.setDate(end.getDate() + totalDays)
        return end
      })()

  // Day-based allocation: always use days
  const rawDaysFromWeeks = sortedDefs.map((d) => (typeof d.weeks === 'number' ? Math.round(d.weeks * 7) : null))
  const hasDuration = rawDaysFromWeeks.every((d) => d != null && d > 0)
  let phaseEstimatedDaysList

  if (hasDuration) {
    let rawDays = rawDaysFromWeeks.map((d) => d ?? 1)
    let sum = rawDays.reduce((s, d) => s + d, 0)
    if (sum !== totalDays) {
      if (sum > 0) {
        rawDays = rawDays.map((d) => Math.max(1, Math.round((d / sum) * totalDays)))
        sum = rawDays.reduce((s, d) => s + d, 0)
        const diff = totalDays - sum
        if (diff !== 0) {
          const adjustIdx = sortedDefs.findIndex((d) =>
            (d.title || '').toLowerCase().includes('development')
          )
          const idx = adjustIdx >= 0 ? adjustIdx : 0
          rawDays[idx] = Math.max(1, rawDays[idx] + diff)
        }
      } else {
        rawDays = sortedDefs.map(() => 1)
        rawDays[0] = totalDays - rawDays.length + 1
      }
    }
    phaseEstimatedDaysList = rawDays
  } else {
    const n = sortedDefs.length
    const perPhaseDays = Math.floor(totalDays / n)
    const remainder = totalDays - perPhaseDays * n
    phaseEstimatedDaysList = sortedDefs.map((_, i) => {
      const days = i < remainder ? perPhaseDays + 1 : perPhaseDays
      return days > 0 ? days : 1
    })
  }

  let currentPhaseStart = new Date(projectStart)

  const phasesToCreate = []
  for (let i = 0; i < sortedDefs.length; i++) {
    const d = sortedDefs[i]
    const title = typeof d.title === 'string' ? d.title.trim() : `Phase ${d.order ?? i + 1}`
    const description = d.description != null ? String(d.description).trim() : null
    const order = i + 1
    const deliverables = Array.isArray(d.deliverables)
      ? d.deliverables.map((x) => (typeof x === 'string' ? x.trim() : String(x))).filter(Boolean)
      : []
    const estimatedDurationDays = phaseEstimatedDaysList[i] ?? 1
    let phaseDueDate
    if (d.dueDate) {
      phaseDueDate = new Date(d.dueDate)
    } else {
      phaseDueDate = new Date(currentPhaseStart)
      phaseDueDate.setDate(phaseDueDate.getDate() + estimatedDurationDays)
    }

    const requiresApproval = checkClientApprovalRequired({ title })
    let clientQuestions = []
    try {
      clientQuestions = await extractClientQuestionsFromPreview(project._id, title)
    } catch {
      clientQuestions = getDefaultQuestionsForPhase(title)
    }

    let subSteps
    if (Array.isArray(d.subSteps) && d.subSteps.length > 0) {
      subSteps = d.subSteps
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((s, index) => {
          const existingTodos = Array.isArray(s.todos) && s.todos.length > 0
            ? s.todos.map((t, k) => ({ text: (t.text ?? '').trim(), completed: false, order: k + 1 })).filter((t) => t.text)
            : []
          return {
            title: typeof s.title === 'string' ? s.title.trim() : `Task ${index + 1}`,
            completed: false,
            order: index + 1,
            notes: '',
            status: 'pending',
            todos: existingTodos,
          }
        })
    } else {
      subSteps = deliverables.map((deliverable, index) => ({
        title: deliverable,
        completed: false,
        order: index + 1,
        notes: '',
        status: 'pending',
        todos: [],
      }))
    }

    if (subSteps.length === 0) {
      subSteps = [
        {
          title: title,
          completed: false,
          order: 1,
          notes: '',
          status: 'pending',
          todos: [],
        },
      ]
    }

    // Compute sub-step due dates (equal segments within phase)
    const phaseDurationMs = phaseDueDate.getTime() - currentPhaseStart.getTime()
    const segmentMs = phaseDurationMs / subSteps.length
    subSteps = subSteps.map((s, idx) => {
      const subDue = new Date(currentPhaseStart.getTime() + segmentMs * (idx + 1))
      const estimatedDurationDays = Math.round(segmentMs / (24 * 60 * 60 * 1000))
      const todos = (s.todos && s.todos.length > 0)
        ? s.todos
        : generateSubStepTodos({ title: s.title, estimatedDurationDays, deliverables }).map((t) => ({ ...t, completed: false }))
      return {
        ...s,
        dueDate: subDue,
        estimatedDurationDays,
        todos,
      }
    })

    const numSubSteps = Math.max(1, subSteps.length)
    const clientQuestionsWithSubStep = clientQuestions.map((q, j) => ({
      ...q,
      subStepOrder: (j % numSubSteps) + 1,
    }))

    phasesToCreate.push({
      projectId: project._id,
      title,
      description,
      order,
      status: 'not_started',
      deliverables,
      estimatedDurationDays,
      startedAt: new Date(currentPhaseStart),
      dueDate: new Date(phaseDueDate),
      requiresClientApproval: requiresApproval,
      clientApproved: false,
      clientQuestions: clientQuestionsWithSubStep,
      subSteps,
      notes: '',
      attachments: [],
    })

    currentPhaseStart = new Date(phaseDueDate)
  }

  await ProjectPhase.insertMany(phasesToCreate)
  project.phaseProposal = null
  await project.save()
  await logProjectActivity(project._id, req.user._id, 'phases.confirmed', null, null, { phaseCount: phasesToCreate.length })
  if (project.clientId) {
    await createNotification(
      project.clientId,
      'project_updated',
      'Timeline Ready',
      'The project timeline has been created. Please review the phases in the Workspace.',
      project._id
    )
  }
  const phases = await ProjectPhase.find({ projectId: project._id }).sort({ order: 1 }).lean()
  res.status(201).json(phases)
})

// @desc    Update a project phase (enhanced with all new fields). Programmer or admin only.
// @route   PATCH /api/projects/:projectId/phases/:phaseId
// @access  Private (assigned programmer or admin)
export const updatePhase = asyncHandler(async (req, res) => {
  const projectId = req.params.id
  const phaseId = req.params.phaseId
  const project = await Project.findById(projectId).lean()
  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }
  const assignedId = project.assignedProgrammerId?.toString?.() || project.assignedProgrammerId?.toString()
  const assignedIds = (project.assignedProgrammerIds || []).map((id) => (id?._id || id)?.toString?.())
  const userId = req.user._id.toString()
  const isProgrammer = assignedId === userId || assignedIds.includes(userId)
  const isClient = project.clientId?.toString() === req.user._id.toString()
  
  // Check permissions - programmer/admin can update most fields, client can only answer questions/approve
  if (req.user.role !== 'admin' && !isProgrammer && !isClient) {
    res.status(403)
    throw new Error('Not authorized to update this phase')
  }

  const phase = await ProjectPhase.findOne({ _id: phaseId, projectId })
  if (!phase) {
    res.status(404)
    throw new Error('Phase not found')
  }

  const previousStatus = phase.status

  // Status updates - only programmer/admin
  if (req.body.status !== undefined) {
    if (!isProgrammer && req.user.role !== 'admin') {
      res.status(403)
      throw new Error('Only programmer or admin can update phase status')
    }
    const valid = ['not_started', 'in_progress', 'completed'].includes(req.body.status)
    if (!valid) {
      res.status(400)
      throw new Error('Invalid phase status')
    }
    
    const oldStatus = phase.status
    phase.status = req.body.status
    
    // Set startedAt when moving to in_progress
    if (oldStatus === 'not_started' && req.body.status === 'in_progress') {
      phase.startedAt = new Date()
    }
    
    // Set completedAt when moving to completed
    if (req.body.status === 'completed') {
      phase.completedAt = new Date()
      // Calculate actual duration
      phase.actualDurationDays = calculatePhaseDuration(phase)
    } else if (req.body.status !== 'completed') {
      phase.completedAt = null
    }
  }

  // Allow client to update questions and approval
  if (isClient || isProgrammer || req.user.role === 'admin') {
    if (req.body.clientQuestions !== undefined) {
      phase.clientQuestions = req.body.clientQuestions
    }
    if (req.body.clientApproved !== undefined && (isClient || req.user.role === 'admin')) {
      phase.clientApproved = req.body.clientApproved
      phase.clientApprovedAt = req.body.clientApproved ? new Date() : null
    }
  }

  // Only programmer/admin can update these fields
  let subStepStatusesBefore = null
  if (isProgrammer || req.user.role === 'admin') {
    if (req.body.subSteps !== undefined) {
      const existingSubSteps = phase.subSteps || []
      subStepStatusesBefore = existingSubSteps.map((s) => ({
        id: (s._id || s.id)?.toString(),
        order: s.order,
        status: s.status,
        title: s.title,
      }))
      phase.subSteps = req.body.subSteps.map((step) => {
        const normalized = { ...step }
        const existing = existingSubSteps.find(
          (s) => (s._id || s.id)?.toString() === (step._id || step.id)?.toString()
        )
        const isNew = !existing
        const changed =
          isNew ||
          existing.title !== step.title ||
          existing.notes !== step.notes ||
          existing.status !== step.status ||
          existing.order !== step.order ||
          (existing.completed !== step.completed && step.completed !== undefined)
        if (normalized.assignedTo != null) {
          normalized.assignedTo =
            typeof normalized.assignedTo === 'object' &&
            normalized.assignedTo !== null &&
            normalized.assignedTo._id != null
              ? normalized.assignedTo._id
              : normalized.assignedTo
        } else if (existing?.assignedTo != null) {
          normalized.assignedTo =
            typeof existing.assignedTo === 'object' && existing.assignedTo._id != null
              ? existing.assignedTo._id
              : existing.assignedTo
        }
        if (changed) {
          normalized.assignedTo = req.user._id
        }
        return normalized
      })
    }
    if (req.body.notes !== undefined) {
      phase.notes = req.body.notes
    }
    if (req.body.estimatedDurationDays !== undefined) {
      phase.estimatedDurationDays = req.body.estimatedDurationDays
    }
    if (req.body.description !== undefined) {
      phase.description = req.body.description
    }
    if (req.body.deliverables !== undefined) {
      phase.deliverables = req.body.deliverables
    }
  }

  if (req.body.completedAt !== undefined && (isProgrammer || req.user.role === 'admin')) {
    phase.completedAt = req.body.completedAt
  }

  await phase.save()
  
  // Recalculate duration if needed
  if (phase.startedAt && phase.completedAt) {
    phase.actualDurationDays = calculatePhaseDuration(phase)
    await phase.save()
  }

  // Send notification to client if phase was just completed by programmer
  if (phase.status === 'completed' && previousStatus !== 'completed' && isProgrammer && project.clientId) {
    await createNotification(
      project.clientId,
      'project_updated',
      'Phase Completed',
      `The programmer has marked phase "${phase.title}" as completed for project "${project.title}". Please review and approve if required.`,
      projectId
    )
  }

  // Send notification to client when any sub-step changes to waiting_client
  if (subStepStatusesBefore && isProgrammer && project.clientId && phase.subSteps?.length > 0) {
    const changedToWaiting = phase.subSteps.find((s, idx) => {
      const prev = subStepStatusesBefore.find(
        (p) => (p.id && (s._id || s.id)?.toString() === p.id) || p.order === (s.order ?? idx + 1)
      )
      const prevStatus = prev?.status ?? 'pending'
      const newStatus = s.status ?? 'pending'
      return prevStatus !== 'waiting_client' && newStatus === 'waiting_client'
    })
    if (changedToWaiting) {
      const taskTitle = changedToWaiting.title || 'A task'
      await createNotification(
        project.clientId,
        'project_updated',
        'Action Needed',
        `"${taskTitle}" is waiting on your input in phase "${phase.title}" for project "${project.title}".`,
        projectId
      )
    }
  }

  // Activity log for phase status changes
  if (phase.status !== previousStatus) {
    const action = phase.status === 'in_progress' ? 'phase.started' : phase.status === 'completed' ? 'phase.completed' : 'phase.updated'
    await logProjectActivity(projectId, req.user._id, action, 'phase', phase._id, { phaseTitle: phase.title, fromStatus: previousStatus, toStatus: phase.status })
  }

  const updated = await ProjectPhase.findById(phase._id)
    .populate('subSteps.assignedTo', 'name email avatar')
    .lean()
  res.json(updated)
})

// @desc    Add or update sub-step in a phase
// @route   POST /api/projects/:id/phases/:phaseId/sub-steps
// @access  Private (assigned programmer or admin)
export const updateSubStep = asyncHandler(async (req, res) => {
  const projectId = req.params.id
  const phaseId = req.params.phaseId
  const project = await Project.findById(projectId).lean()
  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }
  const assignedId = project.assignedProgrammerId?.toString?.() || project.assignedProgrammerId?.toString()
  const assignedIds = (project.assignedProgrammerIds || []).map((id) => (id?._id || id)?.toString?.())
  const userId = req.user._id.toString()
  const isProgrammer = assignedId === userId || assignedIds.includes(userId)
  if (req.user.role !== 'admin' && !isProgrammer) {
    res.status(403)
    throw new Error('Only the assigned programmer or admin can update sub-steps')
  }

  const phase = await ProjectPhase.findOne({ _id: phaseId, projectId })
  if (!phase) {
    res.status(404)
    throw new Error('Phase not found')
  }

  const { subStepId, title, completed, notes, order, status } = req.body

  const validSubStepStatuses = ['pending', 'waiting_client', 'in_progress', 'completed']

  if (!phase.subSteps) {
    phase.subSteps = []
  }

  if (subStepId) {
    // Update existing sub-step
    const subStepIndex = phase.subSteps.findIndex((s) => s._id?.toString() === subStepId)
    if (subStepIndex === -1) {
      res.status(404)
      throw new Error('Sub-step not found')
    }
    if (title !== undefined) phase.subSteps[subStepIndex].title = title
    if (completed !== undefined) phase.subSteps[subStepIndex].completed = completed
    if (notes !== undefined) phase.subSteps[subStepIndex].notes = notes
    if (order !== undefined) phase.subSteps[subStepIndex].order = order
    if (status !== undefined) {
      if (!validSubStepStatuses.includes(status)) {
        res.status(400)
        throw new Error(`Invalid sub-step status. Must be one of: ${validSubStepStatuses.join(', ')}`)
      }
      phase.subSteps[subStepIndex].status = status
      phase.subSteps[subStepIndex].completed = status === 'completed'
    }
    phase.subSteps[subStepIndex].assignedTo = req.user._id
  } else {
    // Add new sub-step
    const maxOrder = phase.subSteps.length > 0
      ? Math.max(...phase.subSteps.map((s) => s.order || 0))
      : 0
    const newStatus = status && validSubStepStatuses.includes(status) ? status : 'pending'
    phase.subSteps.push({
      title: title || 'New sub-step',
      completed: completed ?? (newStatus === 'completed'),
      notes: notes || '',
      order: order !== undefined ? order : maxOrder + 1,
      status: newStatus,
      assignedTo: req.user._id,
    })
  }

  await phase.save()
  const updated = await ProjectPhase.findById(phase._id)
    .populate('subSteps.assignedTo', 'name email avatar')
    .lean()
  res.json(updated)
})

// @desc    Answer a client question (optionally scoped to a sub-step so each task has its own answers)
// @route   POST /api/projects/:id/phases/:phaseId/questions/:questionId/answer
// @access  Private (client, assigned programmer, or admin)
export const answerQuestion = asyncHandler(async (req, res) => {
  const projectId = req.params.id
  const phaseId = req.params.phaseId
  const questionId = req.params.questionId
  const { answer, subStepOrder } = req.body

  const project = await Project.findById(projectId).lean()
  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  const isClient = project.clientId?.toString() === req.user._id.toString()
  const assignedId = project.assignedProgrammerId?.toString?.() || project.assignedProgrammerId?.toString()
  const assignedIds = (project.assignedProgrammerIds || []).map((id) => (id?._id || id)?.toString?.())
  const userId = req.user._id.toString()
  const isProgrammer = assignedId === userId || assignedIds.includes(userId)

  if (!isClient && !isProgrammer && req.user.role !== 'admin') {
    res.status(403)
    throw new Error('Not authorized to answer questions')
  }

  const phase = await ProjectPhase.findOne({ _id: phaseId, projectId })
  if (!phase) {
    res.status(404)
    throw new Error('Phase not found')
  }

  if (!phase.clientQuestions || phase.clientQuestions.length === 0) {
    res.status(404)
    throw new Error('No questions found for this phase')
  }

  const questionIndex = phase.clientQuestions.findIndex(
    (q) => q._id?.toString() === questionId || q.order?.toString() === questionId
  )

  if (questionIndex === -1) {
    res.status(404)
    throw new Error('Question not found')
  }

  const questionOrder = phase.clientQuestions[questionIndex].order

  if (subStepOrder != null && Number.isInteger(Number(subStepOrder))) {
    const subStepIndex = phase.subSteps.findIndex(
      (s) => s.order === Number(subStepOrder)
    )
    if (subStepIndex === -1) {
      res.status(404)
      throw new Error('Sub-step not found')
    }
    if (!phase.subSteps[subStepIndex].questionAnswers) {
      phase.subSteps[subStepIndex].questionAnswers = []
    }
    const qa = phase.subSteps[subStepIndex].questionAnswers.find(
      (a) => a.order === questionOrder
    )
    if (qa) {
      qa.answer = answer || ''
    } else {
      phase.subSteps[subStepIndex].questionAnswers.push({
        order: questionOrder,
        answer: answer || '',
      })
    }
    if (isProgrammer || req.user.role === 'admin') {
      phase.subSteps[subStepIndex].assignedTo = req.user._id
    }
  } else {
    phase.clientQuestions[questionIndex].answer = answer || ''
  }

  await phase.save()
  const updated = await ProjectPhase.findById(phase._id)
    .populate('subSteps.assignedTo', 'name email avatar')
    .lean()
  res.json(updated)
})

// @desc    Client approves a phase
// @route   POST /api/projects/:id/phases/:phaseId/approve
// @access  Private (client or admin)
export const approvePhase = asyncHandler(async (req, res) => {
  const projectId = req.params.id
  const phaseId = req.params.phaseId
  const { approved, feedback } = req.body

  const project = await Project.findById(projectId).lean()
  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  const isClient = project.clientId?.toString() === req.user._id.toString()
  if (!isClient && req.user.role !== 'admin') {
    res.status(403)
    throw new Error('Only the client or admin can approve phases')
  }

  const phase = await ProjectPhase.findOne({ _id: phaseId, projectId })
  if (!phase) {
    res.status(404)
    throw new Error('Phase not found')
  }

  if (!phase.requiresClientApproval) {
    res.status(400)
    throw new Error('This phase does not require client approval')
  }

  const previousStatus = phase.status
  phase.clientApproved = approved !== false
  phase.clientApprovedAt = phase.clientApproved ? new Date() : null
  phase.clientApprovalFeedback = approved === false ? (feedback || null) : null

  // If approved and phase is in_progress, can mark as completed (if all other requirements met)
  if (phase.clientApproved && phase.status === 'in_progress') {
    // Check if all required questions are answered
    const requiredQuestions = phase.clientQuestions?.filter((q) => q.required) || []
    const allAnswered = requiredQuestions.every((q) => q.answer && q.answer.trim() !== '')
    
    if (allAnswered) {
      phase.status = 'completed'
      phase.completedAt = new Date()
      phase.actualDurationDays = calculatePhaseDuration(phase)
    }
  }

  await phase.save()

  // Send notification to programmer if phase was just completed
  if (phase.status === 'completed' && previousStatus !== 'completed' && project.assignedProgrammerId) {
    await createNotification(
      project.assignedProgrammerId,
      'project_updated',
      'Phase Completed',
      `The client has approved and completed phase "${phase.title}" for project "${project.title}".`,
      projectId
    )
  }

  // Send notification to programmer(s) when client requests changes
  if (phase.clientApproved === false && project.clientId) {
    const feedbackText = phase.clientApprovalFeedback?.trim() || 'No feedback provided'
    const message = `The client requested changes on phase "${phase.title}" for project "${project.title}". Feedback: ${feedbackText}`
    const programmerIds = [
      ...(project.assignedProgrammerId ? [project.assignedProgrammerId] : []),
      ...(project.assignedProgrammerIds || []),
    ]
    const uniqueIds = [...new Set(programmerIds.map((id) => (id?._id || id)?.toString()).filter(Boolean))]
    for (const id of uniqueIds) {
      await createNotification(id, 'project_updated', 'Changes Requested', message, projectId)
    }
  }

  if (phase.clientApproved) {
    await logProjectActivity(projectId, req.user._id, 'phase.approved', 'phase', phase._id, { phaseTitle: phase.title })
  }

  const updated = await ProjectPhase.findById(phase._id).lean()
  res.json(updated)
})

// @desc    Upload attachment to a phase
// @route   POST /api/projects/:id/phases/:phaseId/attachments
// @access  Private (assigned programmer, client, or admin)
export const uploadAttachment = asyncHandler(async (req, res) => {
  const projectId = req.params.id
  const phaseId = req.params.phaseId

  const project = await Project.findById(projectId).lean()
  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  const isClient = project.clientId?.toString() === req.user._id.toString()
  const assignedId = project.assignedProgrammerId?.toString?.() || project.assignedProgrammerId?.toString()
  const assignedIds = (project.assignedProgrammerIds || []).map((id) => (id?._id || id)?.toString?.())
  const userId = req.user._id.toString()
  const isProgrammer = assignedId === userId || assignedIds.includes(userId)

  if (!isClient && !isProgrammer && req.user.role !== 'admin') {
    res.status(403)
    throw new Error('Not authorized to upload attachments')
  }

  const phase = await ProjectPhase.findOne({ _id: phaseId, projectId })
  if (!phase) {
    res.status(404)
    throw new Error('Phase not found')
  }

  if (!req.file) {
    res.status(400)
    throw new Error('No file uploaded')
  }

  const attachment = {
    filename: req.file.originalname,
    url: `/uploads/phases/${req.file.filename}`,
    uploadedBy: req.user._id,
    uploadedAt: new Date(),
    type: req.file.mimetype || 'file',
  }

  if (!phase.attachments) {
    phase.attachments = []
  }

  phase.attachments.push(attachment)
  await phase.save()

  const updated = await ProjectPhase.findById(phase._id).lean()
  res.json(updated)
})

// @desc    Delete attachment from a phase
// @route   DELETE /api/projects/:id/phases/:phaseId/attachments/:attachmentId
// @access  Private (assigned programmer, client who uploaded, or admin)
export const deleteAttachment = asyncHandler(async (req, res) => {
  const projectId = req.params.id
  const phaseId = req.params.phaseId
  const attachmentId = req.params.attachmentId

  const project = await Project.findById(projectId).lean()
  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  const phase = await ProjectPhase.findOne({ _id: phaseId, projectId })
  if (!phase) {
    res.status(404)
    throw new Error('Phase not found')
  }

  if (!phase.attachments || phase.attachments.length === 0) {
    res.status(404)
    throw new Error('No attachments found')
  }

  const attachmentIndex = phase.attachments.findIndex(
    (a) => a._id?.toString() === attachmentId
  )

  if (attachmentIndex === -1) {
    res.status(404)
    throw new Error('Attachment not found')
  }

  const attachment = phase.attachments[attachmentIndex]
  const isUploader = attachment.uploadedBy?.toString() === req.user._id.toString()
  const assignedId = project.assignedProgrammerId?.toString?.() || project.assignedProgrammerId?.toString()
  const assignedIds = (project.assignedProgrammerIds || []).map((id) => (id?._id || id)?.toString?.())
  const userId = req.user._id.toString()
  const isProgrammer = assignedId === userId || assignedIds.includes(userId)

  if (!isUploader && !isProgrammer && req.user.role !== 'admin') {
    res.status(403)
    throw new Error('Not authorized to delete this attachment')
  }

  // Delete file from filesystem
  if (attachment.url) {
    const filePath = path.join(__dirname, '..', attachment.url)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  }

  phase.attachments.splice(attachmentIndex, 1)
  await phase.save()

  const updated = await ProjectPhase.findById(phase._id).lean()
  res.json(updated)
})

// Export multer middleware for use in routes
export { upload }

// @desc    Get AI previews for a project (client or assigned programmer)
// @route   GET /api/projects/:id/previews
// @access  Private (project owner, assigned programmer, or admin)
export const getProjectPreviews = asyncHandler(async (req, res) => {
  const previews = await AIPreview.find({ projectId: req.params.id })
    .select('_id prompt previewResult metadata status createdAt tokenUsage')
    .sort({ createdAt: -1 })
    .lean()

  for (const p of previews) {
    normalizePreviewMetadata(p.metadata)
    let urlsForInject = []
    if (p.metadata?.generatedImageGcsPaths?.length) {
      urlsForInject = await getSignedUrlsForPaths(p.metadata.generatedImageGcsPaths, 3600000)
      if (urlsForInject.length > 0) {
        p.metadata.previewThumbnailUrl = urlsForInject[2] || urlsForInject[1] || urlsForInject[0]
      }
    } else if (p.metadata?.generatedImageUrls?.length) {
      urlsForInject = p.metadata.generatedImageUrls
    }
    if (urlsForInject.length > 0) {
      const inj = injectGeneratedImages(
        p.metadata.websitePreviewCode,
        p.metadata.websitePreviewFiles,
        urlsForInject
      )
      p.metadata.websitePreviewCode = inj.code
      if (inj.files) p.metadata.websitePreviewFiles = inj.files
    }
  }
  res.json(previews)
})

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
export const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  if (req.user.role === 'user') {
    if (project.clientId.toString() !== req.user._id.toString()) {
      res.status(403)
      throw new Error('Not authorized to update this project')
    }
    // Allow updating teamClosed when Holding or Open
    const isUpdatingTeamClosed = req.body.teamClosed !== undefined
    if (!isUpdatingTeamClosed && !['Holding', 'Open', 'Ready'].includes(project.status)) {
      res.status(403)
      throw new Error('Cannot update project in current status')
    }
  }

  const previousStatus = project.status
  const wasTeamClosed = project.teamClosed
  const isClosingTeam = req.body.teamClosed === true && !wasTeamClosed
  const isOpeningTeam = req.body.teamClosed === false && wasTeamClosed

  Object.keys(req.body).forEach((key) => {
    if (req.body[key] !== undefined && key !== '_id' && key !== 'clientId') {
      project[key] = req.body[key]
    }
  })

  // If team is being closed from Open: go to Holding (On Hold) — reset all ready states
  if (isClosingTeam && project.status === 'Open') {
    project.status = 'Holding'
    project.readyConfirmedBy = []
    project.clientMarkedReady = false
  }

  // If team is being opened from Holding: go to Open (programmers can join)
  if (isOpeningTeam && project.status === 'Holding') {
    project.status = 'Open'
    project.teamClosed = false
    project.readyConfirmedBy = []
  }

  // If opening from Development: change back to Ready
  if (isOpeningTeam && project.status === 'Development') {
    project.status = 'Ready'
  }

  await project.save()

  

  if (project.status !== previousStatus) {
    await logProjectActivity(project._id, req.user._id, 'project.status_changed', 'project', project._id, { fromStatus: previousStatus, toStatus: project.status })
  }

  const populated = await Project.findById(project._id)
    .populate('clientId', 'name email')
    .populate('assignedProgrammerId', 'name email skills bio hourlyRate')

  res.json(populated)
})

// @desc    Confirm ready (programmer marks themselves ready) - only after client has marked ready
// @route   PUT /api/projects/:id/confirm-ready
// @access  Private (programmer in team)
export const confirmReady = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  const userIdStr = req.user._id.toString()
  const isProgrammer = req.user.role === 'programmer' || req.user.role === 'admin'
  const isInTeam = project.assignedProgrammerId?.toString() === userIdStr ||
    (project.assignedProgrammerIds && project.assignedProgrammerIds.some(p => (p._id || p).toString() === userIdStr))

  if (!isProgrammer || !isInTeam) {
    res.status(403)
    throw new Error('Only programmers assigned to this project can confirm ready')
  }

  if (project.status !== 'Open') {
    res.status(400)
    throw new Error('Project must be open for recruitment to confirm ready')
  }

  if (!project.clientMarkedReady) {
    res.status(400)
    throw new Error('Client must mark the project ready first before programmers can confirm ready')
  }

  const phaseCount = await ProjectPhase.countDocuments({ projectId: project._id })
  if (phaseCount === 0) {
    res.status(400)
    throw new Error('Create the project timeline in the Workspace first, then you can mark ready')
  }

  if (project.teamClosed) {
    res.status(400)
    throw new Error('Project team is already closed')
  }

  if (!project.readyConfirmedBy) {
    project.readyConfirmedBy = []
  }
  if (!project.readyConfirmedBy.some(id => id.toString() === userIdStr)) {
    project.readyConfirmedBy.push(req.user._id)
    const teamIds = new Set()
    if (project.assignedProgrammerId) teamIds.add(project.assignedProgrammerId.toString())
    ;(project.assignedProgrammerIds || []).forEach((p) => teamIds.add((p._id || p).toString()))
    const confirmedIds = new Set(project.readyConfirmedBy.map((id) => id.toString()))
    const allConfirmed = [...teamIds].every((id) => confirmedIds.has(id))
    if (allConfirmed) {
      project.teamClosed = true
      project.status = 'Ready'
      await logProjectActivity(project._id, req.user._id, 'project.status_changed', 'project', project._id, { fromStatus: 'Open', toStatus: 'Ready' })
    }
    await project.save()
    await logProjectActivity(project._id, req.user._id, 'programmer.confirmed_ready', 'project', project._id, {})
  }

  const populated = await Project.findById(project._id)
    .populate('clientId', 'name email')
    .populate('assignedProgrammerId', 'name email skills bio hourlyRate')
    .populate('assignedProgrammerIds', 'name email')
    .populate('readyConfirmedBy', 'name email')

  res.json(populated)
})

// @desc    Client marks ready for timeline (first step). Programmers can then create steps and confirm ready; when all confirm, status becomes Ready.
// @route   PUT /api/projects/:id/mark-ready
// @access  Private (client only)
export const markProjectReady = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  const isAdmin = req.user.role === 'admin'
  const isClientOwner = project.clientId.toString() === req.user._id.toString()

  if (!isClientOwner && !isAdmin) {
    res.status(403)
    throw new Error('Only the project client can mark as ready')
  }

  if (project.status !== 'Open') {
    res.status(400)
    throw new Error('Project must be open for recruitment to mark as ready')
  }

  // Client marks "I've reviewed - ready for programmers to create steps". Do not require programmers to have joined yet.
  // Client can mark ready with no programmers so when one joins they can create phases straight away.
  if (!project.clientMarkedReady) {
    project.clientMarkedReady = true
    await project.save()
    await logProjectActivity(project._id, req.user._id, 'project.client_marked_ready', 'project', project._id, {})
  }
  // If client already marked ready and all programmers have confirmed, transition to Ready (e.g. client clicks again or late join)
  const teamIds = new Set()
  if (project.assignedProgrammerId) teamIds.add(project.assignedProgrammerId.toString())
  ;(project.assignedProgrammerIds || []).forEach((p) => teamIds.add((p._id || p).toString()))
  const confirmedIds = new Set((project.readyConfirmedBy || []).map((id) => id.toString()))
  const allConfirmed = teamIds.size > 0 && [...teamIds].every((id) => confirmedIds.has(id))
  if (project.clientMarkedReady && allConfirmed && !project.teamClosed) {
    project.teamClosed = true
    project.status = 'Ready'
    await project.save()
    await logProjectActivity(project._id, req.user._id, 'project.status_changed', 'project', project._id, { fromStatus: 'Open', toStatus: 'Ready' })
  }

  const populated = await Project.findById(project._id)
    .populate('clientId', 'name email')
    .populate('assignedProgrammerId', 'name email skills bio hourlyRate')
    .populate('assignedProgrammerIds', 'name email')
    .populate('readyConfirmedBy', 'name email')

  res.json(populated)
})

// @desc    Unconfirm ready (programmer reverts to not ready)
// @route   PUT /api/projects/:id/unconfirm-ready
// @access  Private (programmer in team)
export const unconfirmReady = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  const userIdStr = req.user._id.toString()
  const isProgrammer = req.user.role === 'programmer' || req.user.role === 'admin'
  const isInTeam = project.assignedProgrammerId?.toString() === userIdStr ||
    (project.assignedProgrammerIds && project.assignedProgrammerIds.some(p => (p._id || p).toString() === userIdStr))

  if (!isProgrammer || !isInTeam) {
    res.status(403)
    throw new Error('Only programmers assigned to this project can unconfirm ready')
  }

  if (project.status !== 'Open' && project.status !== 'Ready') {
    res.status(400)
    throw new Error('Project must be Open or Ready to unconfirm')
  }

  if (!project.readyConfirmedBy || !project.readyConfirmedBy.some(id => id.toString() === userIdStr)) {
    const populated = await Project.findById(project._id)
      .populate('clientId', 'name email')
      .populate('assignedProgrammerId', 'name email skills bio hourlyRate')
      .populate('assignedProgrammerIds', 'name email')
      .populate('readyConfirmedBy', 'name email')
    return res.json(populated)
  }

  project.readyConfirmedBy = project.readyConfirmedBy.filter(id => id.toString() !== userIdStr)

  // If status was Ready (team closed), revert to Open so recruitment can continue
  if (project.status === 'Ready') {
    project.status = 'Open'
    project.teamClosed = false
    await logProjectActivity(project._id, req.user._id, 'project.status_changed', 'project', project._id, { fromStatus: 'Ready', toStatus: 'Open' })
  }

  await project.save()
  await logProjectActivity(project._id, req.user._id, 'programmer.unconfirmed_ready', 'project', project._id, {})

  const populated = await Project.findById(project._id)
    .populate('clientId', 'name email')
    .populate('assignedProgrammerId', 'name email skills bio hourlyRate')
    .populate('assignedProgrammerIds', 'name email')
    .populate('readyConfirmedBy', 'name email')

  res.json(populated)
})

// @desc    Unmark ready (client reverts to not ready)
// @route   PUT /api/projects/:id/unmark-ready
// @access  Private (client only)
export const unmarkProjectReady = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  const isAdmin = req.user.role === 'admin'
  const isClientOwner = project.clientId.toString() === req.user._id.toString()

  if (!isClientOwner && !isAdmin) {
    res.status(403)
    throw new Error('Only the project client can unmark as ready')
  }

  if (project.status !== 'Open' && project.status !== 'Ready') {
    res.status(400)
    throw new Error('Project must be Open or Ready to unmark')
  }

  if (!project.clientMarkedReady) {
    const populated = await Project.findById(project._id)
      .populate('clientId', 'name email')
      .populate('assignedProgrammerId', 'name email skills bio hourlyRate')
      .populate('assignedProgrammerIds', 'name email')
      .populate('readyConfirmedBy', 'name email')
    return res.json(populated)
  }

  project.clientMarkedReady = false
  project.readyConfirmedBy = []
  project.teamClosed = false

  // If status was Ready, revert to Open
  if (project.status === 'Ready') {
    project.status = 'Open'
    await logProjectActivity(project._id, req.user._id, 'project.status_changed', 'project', project._id, { fromStatus: 'Ready', toStatus: 'Open' })
  }

  await project.save()
  await logProjectActivity(project._id, req.user._id, 'project.client_unmarked_ready', 'project', project._id, {})

  const populated = await Project.findById(project._id)
    .populate('clientId', 'name email')
    .populate('assignedProgrammerId', 'name email skills bio hourlyRate')
    .populate('assignedProgrammerIds', 'name email')
    .populate('readyConfirmedBy', 'name email')

  res.json(populated)
})

// @desc    Start development - programmer only
// @route   PUT /api/projects/:id/start-development
// @access  Private
export const startDevelopment = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  const userIdStr = req.user._id.toString()
  const isProgrammer = req.user.role === 'programmer' || req.user.role === 'admin'
  const isInTeam = project.assignedProgrammerId?.toString() === userIdStr ||
    (project.assignedProgrammerIds && project.assignedProgrammerIds.some(p => (p._id || p).toString() === userIdStr))

  if (!isProgrammer || !isInTeam) {
    res.status(403)
    throw new Error('Only programmers assigned to this project can start development')
  }

  if (project.status !== 'Ready') {
    res.status(400)
    throw new Error('Project must be in Ready status (team closed) to start development')
  }

  project.status = 'Development'
  if (!project.startDate) {
    project.startDate = new Date()
  }
  await project.save()

  await logProjectActivity(project._id, req.user._id, 'project.status_changed', 'project', project._id, { fromStatus: 'Ready', toStatus: 'Development' })

  const populated = await Project.findById(project._id)
    .populate('clientId', 'name email')
    .populate('assignedProgrammerId', 'name email skills bio hourlyRate')
    .populate('assignedProgrammerIds', 'name email')

  res.json(populated)
})

// @desc    Stop development - client only
// @route   PUT /api/projects/:id/stop-development
// @access  Private
export const stopDevelopment = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  const userIdStr = req.user._id.toString()
  const isClientOwner = project.clientId.toString() === userIdStr
  const isAdmin = req.user.role === 'admin'
  const isInTeam = project.assignedProgrammerId?.toString() === userIdStr ||
    (project.assignedProgrammerIds && project.assignedProgrammerIds.some(p => (p._id || p).toString() === userIdStr))
  const isProgrammerInProject = (req.user.role === 'programmer' || req.user.role === 'admin') && isInTeam

  if (!isClientOwner && !isProgrammerInProject && !isAdmin) {
    res.status(403)
    throw new Error('Only the project client or assigned programmers can stop development')
  }

  if (project.status !== 'Development') {
    res.status(400)
    throw new Error('Project must be in Development status to stop')
  }

  project.status = 'Ready'
  await project.save()

  await logProjectActivity(project._id, req.user._id, 'project.status_changed', 'project', project._id, { fromStatus: 'Development', toStatus: 'Ready' })

  const populated = await Project.findById(project._id)
    .populate('clientId', 'name email')
    .populate('assignedProgrammerId', 'name email skills bio hourlyRate')
    .populate('assignedProgrammerIds', 'name email')

  res.json(populated)
})

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
export const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  if (req.user.role === 'user' || req.user.role === 'client') {
    if (project.clientId.toString() !== req.user._id.toString()) {
      res.status(403)
      throw new Error('Not authorized to delete this project')
    }
  }

  await ProjectPhase.deleteMany({ projectId: project._id })
  await project.deleteOne()

  res.json({ message: 'Project removed' })
})

// @desc    Update project status (Ready or Holding)
// @route   PUT /api/projects/:id/ready or PUT /api/projects/:id/holding
// @access  Private
export const updateProjectStatus = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  if (req.user.role === 'user' && project.clientId.toString() !== req.user._id.toString()) {
    res.status(403)
    throw new Error('Not authorized to update this project')
  }

  // Determine target status from route path
  const targetStatus = req.path.endsWith('/ready') ? 'Ready' : 'Holding'

  // Validate status transition
  if (targetStatus === 'Ready') {
    if (project.status !== 'Holding') {
      res.status(400)
      throw new Error('Project must be in Holding status to mark as Ready')
    }
    project.status = 'Ready'
  } else if (targetStatus === 'Holding') {
    if (project.status !== 'Ready') {
      res.status(400)
      throw new Error('Project must be in Ready status to mark as Holding')
    }
    project.status = 'Holding'
    project.teamClosed = true
    project.readyConfirmedBy = []
    project.clientMarkedReady = false
  }

  await project.save()

  const populated = await Project.findById(project._id)
    .populate('clientId', 'name email')
    .populate('assignedProgrammerId', 'name email skills bio hourlyRate')

  res.json(populated)
})

// @desc    Mark project as completed (Development -> Completed)
// @route   PUT /api/projects/:id/complete
// @access  Private (client, assigned programmer, or admin)
export const markProjectCompleted = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  const userIdStr = req.user._id.toString()
  const isClientOwner = project.clientId.toString() === userIdStr
  const isInTeam = project.assignedProgrammerId?.toString() === userIdStr ||
    (project.assignedProgrammerIds && project.assignedProgrammerIds.some(p => (p._id || p).toString() === userIdStr))
  const isProgrammerInProject = (req.user.role === 'programmer' || req.user.role === 'admin') && isInTeam

  if (!isClientOwner && !isProgrammerInProject && req.user.role !== 'admin') {
    res.status(403)
    throw new Error('Only the project client or assigned programmers can mark the project as completed')
  }

  if (project.status !== 'Development') {
    res.status(400)
    throw new Error('Project must be in Development status to mark as completed')
  }

  project.status = 'Completed'
  project.completedDate = new Date()
  await project.save()

  await logProjectActivity(project._id, req.user._id, 'project.status_changed', 'project', project._id, { fromStatus: 'Development', toStatus: 'Completed' })

  const populated = await Project.findById(project._id)
    .populate('clientId', 'name email')
    .populate('assignedProgrammerId', 'name email skills bio hourlyRate')
    .populate('assignedProgrammerIds', 'name email')

  res.json(populated)
})

// @desc    Mark project as cancelled
// @route   PUT /api/projects/:id/cancel
// @access  Private (client or admin)
export const markProjectCancelled = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  const isClientOwner = project.clientId.toString() === req.user._id.toString()
  if (!isClientOwner && req.user.role !== 'admin') {
    res.status(403)
    throw new Error('Only the project client or admin can cancel the project')
  }

  if (project.status === 'Completed') {
    res.status(400)
    throw new Error('Cannot cancel a completed project')
  }

  if (project.status === 'Cancelled') {
    res.status(400)
    throw new Error('Project is already cancelled')
  }

  project.status = 'Cancelled'
  await project.save()

  await logProjectActivity(project._id, req.user._id, 'project.status_changed', 'project', project._id, { toStatus: 'Cancelled' })

  const populated = await Project.findById(project._id)
    .populate('clientId', 'name email')
    .populate('assignedProgrammerId', 'name email skills bio hourlyRate')
    .populate('assignedProgrammerIds', 'name email')

  res.json(populated)
})

// @desc    Get project activity (audit log)
// @route   GET /api/projects/:id/activity
// @access  Private (project access)
export const getProjectActivity = asyncHandler(async (req, res) => {
  const projectId = req.params.id
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20))
  const action = req.query.action

  const project = await Project.findById(projectId).lean()
  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  const filter = { projectId }
  if (action) filter.action = action

  const [activities, total] = await Promise.all([
    ProjectActivity.find(filter)
      .populate('actorId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ProjectActivity.countDocuments(filter),
  ])

  res.json({
    activities,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  })
})
