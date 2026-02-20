import Project from '../models/Project.js'
import ProjectPhase from '../models/ProjectPhase.js'
import ProjectActivity from '../models/ProjectActivity.js'
import AIPreview from '../models/AIPreview.js'
import { getPhasesForProjectType } from '../utils/phaseTemplates.js'
import { logProjectActivity } from '../utils/activityLogger.js'
import { getPhasesFromAIAnalysis, extractClientQuestionsFromPreview } from '../utils/aiAnalysisPhases.js'
import { calculatePhaseDuration, checkClientApprovalRequired, getDefaultQuestionsForPhase } from '../utils/phaseWorkflow.js'
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

  const phases = await ProjectPhase.find({ projectId: project._id })
    .sort({ order: 1 })
    .lean()

  const previewCount = await AIPreview.countDocuments({
    projectId: project._id,
    status: 'completed'
  })

  res.json({ ...project, phases, previewCount })
})

// @desc    Get proposed timeline (from AI or template). No phases created.
// @route   GET /api/projects/:id/phases/proposal
// @access  Private (project access)
export const getPhaseProposal = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id).lean()
  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  let definitions = await getPhasesFromAIAnalysis(project._id)
  if (!definitions?.length) {
    const template = getPhasesForProjectType(project.projectType)
    definitions = template.map((d) => ({
      title: d.title,
      description: d.description ?? null,
      order: d.order,
      deliverables: d.deliverables ?? [],
      weeks: d.weeks ?? null,
    }))
  }

  const proposal = definitions.map((d) => ({
    title: d.title,
    description: d.description ?? null,
    order: d.order,
    deliverables: Array.isArray(d.deliverables) ? d.deliverables : [],
    weeks: d.weeks ?? null,
  }))

  res.json(proposal)
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
    throw new Error('Request body must be an array of phase definitions (title, description, order, deliverables?)')
  }

  const phasesToCreate = await Promise.all(
    definitions.map(async (d) => {
      const title = typeof d.title === 'string' ? d.title.trim() : `Phase ${d.order ?? 0}`
      const description = d.description != null ? String(d.description).trim() : null
      const order = typeof d.order === 'number' ? d.order : 0
      const deliverables = Array.isArray(d.deliverables) ? d.deliverables.map((x) => (typeof x === 'string' ? x.trim() : String(x))).filter(Boolean) : []
      const weeks = typeof d.weeks === 'number' ? d.weeks : null
      const estimatedDurationDays = weeks ? weeks * 7 : null

      const requiresApproval = checkClientApprovalRequired({ title })
      let clientQuestions = []
      try {
        clientQuestions = await extractClientQuestionsFromPreview(project._id, title)
      } catch {
        clientQuestions = getDefaultQuestionsForPhase(title)
      }

      const subSteps = deliverables.map((deliverable, index) => ({
        title: deliverable,
        completed: false,
        order: index + 1,
        notes: '',
      }))

      return {
        projectId: project._id,
        title,
        description,
        order,
        status: 'not_started',
        deliverables,
        estimatedDurationDays,
        requiresClientApproval: requiresApproval,
        clientApproved: false,
        clientQuestions,
        subSteps,
        notes: '',
        attachments: [],
      }
    })
  )

  await ProjectPhase.insertMany(phasesToCreate)
  await logProjectActivity(project._id, req.user._id, 'phases.confirmed', null, null, { phaseCount: phasesToCreate.length })
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
  if (isProgrammer || req.user.role === 'admin') {
    if (req.body.subSteps !== undefined) {
      phase.subSteps = req.body.subSteps
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

  // Activity log for phase status changes
  if (phase.status !== previousStatus) {
    const action = phase.status === 'in_progress' ? 'phase.started' : phase.status === 'completed' ? 'phase.completed' : 'phase.updated'
    await logProjectActivity(projectId, req.user._id, action, 'phase', phase._id, { phaseTitle: phase.title, fromStatus: previousStatus, toStatus: phase.status })
  }

  const updated = await ProjectPhase.findById(phase._id).lean()
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

  const { subStepId, title, completed, notes, order } = req.body

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
  } else {
    // Add new sub-step
    const maxOrder = phase.subSteps.length > 0
      ? Math.max(...phase.subSteps.map((s) => s.order || 0))
      : 0
    phase.subSteps.push({
      title: title || 'New sub-step',
      completed: completed || false,
      notes: notes || '',
      order: order !== undefined ? order : maxOrder + 1,
    })
  }

  await phase.save()
  const updated = await ProjectPhase.findById(phase._id).lean()
  res.json(updated)
})

// @desc    Answer a client question
// @route   POST /api/projects/:id/phases/:phaseId/questions/:questionId/answer
// @access  Private (client, assigned programmer, or admin)
export const answerQuestion = asyncHandler(async (req, res) => {
  const projectId = req.params.id
  const phaseId = req.params.phaseId
  const questionId = req.params.questionId
  const { answer } = req.body

  const project = await Project.findById(projectId).lean()
  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  const isClient = project.clientId?.toString() === req.user._id.toString()
  const assignedId = project.assignedProgrammerId?.toString?.() || project.assignedProgrammerId?.toString()
  const isProgrammer = assignedId && req.user._id.toString() === assignedId

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

  phase.clientQuestions[questionIndex].answer = answer || ''

  await phase.save()
  const updated = await ProjectPhase.findById(phase._id).lean()
  res.json(updated)
})

// @desc    Client approves a phase
// @route   POST /api/projects/:id/phases/:phaseId/approve
// @access  Private (client or admin)
export const approvePhase = asyncHandler(async (req, res) => {
  const projectId = req.params.id
  const phaseId = req.params.phaseId
  const { approved } = req.body

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

  // If team is being closed from Open: go to Holding (On Hold) — no one can be ready in Holding
  if (isClosingTeam && project.status === 'Open') {
    project.status = 'Holding'
    project.readyConfirmedBy = []
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

// @desc    Confirm ready (programmer marks themselves ready for dev)
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

  if (project.teamClosed) {
    res.status(400)
    throw new Error('Project team is already closed')
  }

  if (!project.readyConfirmedBy) {
    project.readyConfirmedBy = []
  }
  if (!project.readyConfirmedBy.some(id => id.toString() === userIdStr)) {
    project.readyConfirmedBy.push(req.user._id)
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

// @desc    Mark project ready (close team, ready for dev) - client only, when Open + has programmers + all team confirmed
// @route   PUT /api/projects/:id/mark-ready
// @access  Private
export const markProjectReady = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  const isClient = req.user.role === 'user' || req.user.role === 'client'
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

  const hasProgrammers = project.assignedProgrammerId ||
    (project.assignedProgrammerIds && project.assignedProgrammerIds.length > 0)
  if (!hasProgrammers) {
    res.status(400)
    throw new Error('At least one programmer must have joined before marking as ready')
  }

  // Require all team members to have confirmed ready
  const teamIds = new Set()
  if (project.assignedProgrammerId) {
    teamIds.add(project.assignedProgrammerId.toString())
  }
  ;(project.assignedProgrammerIds || []).forEach((p) => {
    teamIds.add((p._id || p).toString())
  })
  const confirmedIds = new Set((project.readyConfirmedBy || []).map((id) => id.toString()))
  const allConfirmed = [...teamIds].every((id) => confirmedIds.has(id))
  if (!allConfirmed) {
    res.status(400)
    throw new Error('All team members must mark themselves as ready before the project can be marked ready')
  }

  project.teamClosed = true
  project.status = 'Ready'
  await project.save()

  await logProjectActivity(project._id, req.user._id, 'project.status_changed', 'project', project._id, { fromStatus: 'Open', toStatus: 'Ready' })

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
