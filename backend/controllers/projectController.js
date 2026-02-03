import Project from '../models/Project.js'
import ProjectPhase from '../models/ProjectPhase.js'
import AIPreview from '../models/AIPreview.js'
import { getPhasesForProjectType } from '../utils/phaseTemplates.js'
import { getPhasesFromAIAnalysis } from '../utils/aiAnalysisPhases.js'
import { calculatePhaseDuration, checkClientApprovalRequired } from '../utils/phaseWorkflow.js'
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
  }

  const project = await Project.create(projectData)

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
      { assignedProgrammerId: null, status: 'Ready' },
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

  const projects = await Project.find({ assignedProgrammerId: req.user._id })
    .populate('clientId', 'name email')
    .sort({ createdAt: -1 })

  res.json(projects)
})

// @desc    Get project by ID
// @route   GET /api/projects/:id
// @access  Private
export const getProjectById = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('clientId', 'name email')
    .populate('assignedProgrammerId', 'name email skills bio hourlyRate')
    .lean()

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  let phases = await ProjectPhase.find({ projectId: project._id })
    .sort({ order: 1 })
    .lean()

  // If project is in Development (or Completed) but has no phases (e.g. assigned before phases feature), create them now
  if (phases.length === 0 && ['Development', 'Completed'].includes(project.status)) {
    let definitions = await getPhasesFromAIAnalysis(project._id)
    if (!definitions?.length) {
      const template = getPhasesForProjectType(project.projectType)
      definitions = template.map((d) => ({
        title: d.title,
        description: d.description ?? null,
        order: d.order,
        deliverables: [],
      }))
    }
    const created = await ProjectPhase.insertMany(
      definitions.map((d) => ({
        projectId: project._id,
        title: d.title,
        description: d.description ?? null,
        order: d.order,
        status: 'not_started',
        deliverables: Array.isArray(d.deliverables) ? d.deliverables : [],
      }))
    )
    phases = created.map((p) => p.toObject ? p.toObject() : p)
  }

  const previewCount = await AIPreview.countDocuments({
    projectId: project._id,
    status: 'completed'
  })

  res.json({ ...project, phases, previewCount })
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
  const isProgrammer = assignedId && req.user._id.toString() === assignedId
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
  const isProgrammer = assignedId && req.user._id.toString() === assignedId
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
  const isProgrammer = assignedId && req.user._id.toString() === assignedId

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
  const isProgrammer = assignedId && req.user._id.toString() === assignedId

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
    if (!['Holding', 'Ready'].includes(project.status)) {
      res.status(403)
      throw new Error('Cannot update project in current status')
    }
  }

  Object.keys(req.body).forEach((key) => {
    if (req.body[key] !== undefined && key !== '_id' && key !== 'clientId') {
      project[key] = req.body[key]
    }
  })

  await project.save()

  const populated = await Project.findById(project._id)
    .populate('clientId', 'name email')
    .populate('assignedProgrammerId', 'name email skills bio hourlyRate')

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
    if (!['Holding', 'Development'].includes(project.status)) {
      res.status(403)
      throw new Error('Can only delete projects in Holding or Development status')
    }
  }

  await ProjectPhase.deleteMany({ projectId: project._id })
  await project.deleteOne()

  res.json({ message: 'Project removed' })
})

// @desc    Mark project as Ready for assignment
// @route   PUT /api/projects/:id/ready
// @access  Private
export const markProjectReady = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  if (req.user.role === 'user' && project.clientId.toString() !== req.user._id.toString()) {
    res.status(403)
    throw new Error('Not authorized to update this project')
  }

  if (project.status !== 'Holding') {
    res.status(400)
    throw new Error('Project must be in Holding status to mark as Ready')
  }

  project.status = 'Ready'
  await project.save()

  const populated = await Project.findById(project._id)
    .populate('clientId', 'name email')
    .populate('assignedProgrammerId', 'name email skills bio hourlyRate')

  res.json(populated)
})
