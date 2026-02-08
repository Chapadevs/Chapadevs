import Project from '../models/Project.js'
import ProjectPhase from '../models/ProjectPhase.js'
import { createNotification } from './notificationController.js'
import { getPhasesForProjectType } from '../utils/phaseTemplates.js'
import { getPhasesFromAIAnalysis, extractClientQuestionsFromPreview } from '../utils/aiAnalysisPhases.js'
import { checkClientApprovalRequired, getDefaultQuestionsForPhase } from '../utils/phaseWorkflow.js'
import asyncHandler from 'express-async-handler'

async function createPhasesForProject(project) {
  let definitions = await getPhasesFromAIAnalysis(project._id)
  if (!definitions?.length) {
    const template = getPhasesForProjectType(project.projectType)
    definitions = template.map((d) => ({
      title: d.title,
      description: d.description ?? null,
      order: d.order,
      deliverables: [],
      weeks: null, // No weeks info from template
    }))
  }

  // Create phases with enhanced fields
  const phasesToCreate = await Promise.all(
    definitions.map(async (d) => {
      // Convert weeks to estimated duration in days (1 week = 7 days)
      const estimatedDurationDays = d.weeks ? d.weeks * 7 : null

      // Determine if phase requires client approval
      const requiresApproval = checkClientApprovalRequired({ title: d.title })

      // Get client questions for this phase
      let clientQuestions = []
      try {
        clientQuestions = await extractClientQuestionsFromPreview(project._id, d.title)
      } catch (error) {
        // Fallback to default questions if extraction fails
        clientQuestions = getDefaultQuestionsForPhase(d.title)
      }

      // Create initial sub-steps from deliverables
      const subSteps = (d.deliverables || []).map((deliverable, index) => ({
        title: deliverable,
        completed: false,
        order: index + 1,
        notes: '',
      }))

      return {
        projectId: project._id,
        title: d.title,
        description: d.description ?? null,
        order: d.order,
        status: 'not_started',
        deliverables: Array.isArray(d.deliverables) ? d.deliverables : [],
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

  return ProjectPhase.insertMany(phasesToCreate)
}

// @desc    Get available projects (status Ready and team not closed) – public, no auth
// @route   GET /api/assignments/available/public
// @access  Public
export const getAvailableProjectsPublic = asyncHandler(async (req, res) => {
  const projects = await Project.find({
    status: 'Ready',
    $or: [
      { teamClosed: false },
      { teamClosed: { $exists: false } },
      { teamClosed: null },
    ],
  })
    .populate('clientId', 'name company')
    .populate('assignedProgrammerId', 'name')
    .populate('assignedProgrammerIds', 'name')
    .sort({ createdAt: -1 })
    .lean()

  const normalized = projects.map((p) => ({
    ...p,
    client: p.clientId,
    id: p._id,
  }))
  res.json(normalized)
})

// @desc    Get available projects (status Ready and team not closed)
// @route   GET /api/assignments/available
// @access  Private/Programmer
export const getAvailableProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find({
    status: 'Ready',
    $or: [
      { teamClosed: false },
      { teamClosed: { $exists: false } },
      { teamClosed: null },
    ],
    // Exclude projects where this programmer has already joined
    assignedProgrammerIds: { $ne: req.user._id },
    assignedProgrammerId: { $ne: req.user._id },
  })
    .populate('clientId', 'name email company status')
    .populate('assignedProgrammerId', 'name email status')
    .populate('assignedProgrammerIds', 'name email status')
    .sort({ createdAt: -1 })

  res.json(projects)
})

// @desc    Assign project to programmer
// @route   POST /api/assignments/:projectId/assign
// @access  Private/Programmer
export const assignProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params
  const { programmerId } = req.body

  const project = await Project.findById(projectId)

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  if (project.assignedProgrammerId) {
    res.status(400)
    throw new Error('Project is already assigned')
  }

  if (project.status !== 'Ready') {
    res.status(400)
    throw new Error('Project must be in Ready status to be assigned')
  }

  if (project.teamClosed) {
    res.status(400)
    throw new Error('Project team is closed. No more programmers can be assigned.')
  }

  project.assignedProgrammerId = programmerId || req.user._id
  // Don't change status to Development automatically - keep it Ready so others can still join
  if (!project.startDate) {
    project.startDate = new Date()
  }

  await project.save()
  await createPhasesForProject(project)

  await createNotification(
    project.clientId,
    'project_assigned',
    'Project Assigned',
    `Your project "${project.title}" has been assigned to a programmer and is now in development.`,
    project._id
  )

  const populated = await Project.findById(project._id)
    .populate('clientId', 'name email status')
    .populate('assignedProgrammerId', 'name email skills bio hourlyRate status')
    .populate('assignedProgrammerIds', 'name email status')

  res.json(populated)
})

// @desc    Accept project assignment
// @route   POST /api/assignments/:projectId/accept
// @access  Private/Programmer
export const acceptProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params

  const project = await Project.findById(projectId)

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  if (project.status !== 'Ready') {
    res.status(400)
    throw new Error('Project must be in Ready status to be accepted')
  }

  if (project.teamClosed) {
    res.status(400)
    throw new Error('Project team is closed. No more programmers can join.')
  }

  // Check if already assigned to this programmer
  if (project.assignedProgrammerId && project.assignedProgrammerId.toString() === req.user._id.toString()) {
    res.status(400)
    throw new Error('You are already assigned to this project')
  }

  // Track all programmers who join
  const isFirstProgrammer = !project.assignedProgrammerId
  if (isFirstProgrammer) {
    project.assignedProgrammerId = req.user._id
  }
  
  // Add to assignedProgrammerIds array if not already there
  if (!project.assignedProgrammerIds) {
    project.assignedProgrammerIds = []
  }
  const userIdStr = req.user._id.toString()
  if (!project.assignedProgrammerIds.some(id => id.toString() === userIdStr)) {
    project.assignedProgrammerIds.push(req.user._id)
  }
  
  // Don't change status to Development automatically - keep it Ready so others can still join
  if (!project.startDate) {
    project.startDate = new Date()
  }

  await project.save()
  
  // Only create phases if this is the first programmer (to avoid duplicates)
  if (isFirstProgrammer) {
    const existingPhases = await ProjectPhase.countDocuments({ projectId: project._id })
    if (existingPhases === 0) {
      await createPhasesForProject(project)
    }
  }

  await createNotification(
    project.clientId,
    'project_accepted',
    'Project Accepted',
    `A programmer has accepted your project "${project.title}" and development has started.`,
    project._id
  )

  const populated = await Project.findById(project._id)
    .populate('clientId', 'name email')
    .populate('assignedProgrammerId', 'name email skills bio hourlyRate')
    .populate('assignedProgrammerIds', 'name email')

  res.json(populated)
})

// @desc    Reject project assignment
// @route   POST /api/assignments/:projectId/reject
// @access  Private/Programmer
export const rejectProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params

  const project = await Project.findById(projectId)

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  project.assignedProgrammerId = null
  project.status = 'Ready'

  await project.save()
  await ProjectPhase.deleteMany({ projectId: project._id })

  res.json(project)
})

// @desc    Unassign project
// @route   DELETE /api/assignments/:projectId/unassign
// @access  Private/Programmer
export const unassignProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params

  const project = await Project.findById(projectId)

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  if (
    project.assignedProgrammerId &&
    project.assignedProgrammerId.toString() !== req.user._id.toString()
  ) {
    res.status(403)
    throw new Error('Not authorized to unassign this project')
  }

  project.assignedProgrammerId = null
  project.status = 'Ready'

  await project.save()
  await ProjectPhase.deleteMany({ projectId: project._id })

  res.json(project)
})

// @desc    Leave project (remove programmer from project)
// @route   POST /api/assignments/:projectId/leave
// @access  Private/Programmer
export const leaveProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params
  const userId = req.user._id.toString()

  const project = await Project.findById(projectId)

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  // Check if user is part of the project
  const isPrimaryAssigned = project.assignedProgrammerId && 
    project.assignedProgrammerId.toString() === userId
  const isInTeam = project.assignedProgrammerIds && 
    project.assignedProgrammerIds.some(id => id.toString() === userId)

  if (!isPrimaryAssigned && !isInTeam) {
    res.status(403)
    throw new Error('You are not assigned to this project')
  }

  // Remove from primary assigned if they are the primary
  if (isPrimaryAssigned) {
    project.assignedProgrammerId = null
    // If there are other programmers in the team, promote the first one to primary
    if (project.assignedProgrammerIds && project.assignedProgrammerIds.length > 0) {
      const remainingProgrammers = project.assignedProgrammerIds.filter(
        id => id.toString() !== userId
      )
      if (remainingProgrammers.length > 0) {
        project.assignedProgrammerId = remainingProgrammers[0]
        project.assignedProgrammerIds = remainingProgrammers.slice(1)
      } else {
        project.assignedProgrammerIds = []
      }
    }
  } else if (isInTeam) {
    // Remove from assignedProgrammerIds array
    project.assignedProgrammerIds = project.assignedProgrammerIds.filter(
      id => id.toString() !== userId
    )
  }

  // If no programmers left, set status back to Ready
  if (!project.assignedProgrammerId && 
      (!project.assignedProgrammerIds || project.assignedProgrammerIds.length === 0)) {
    project.status = 'Ready'
  }

  await project.save()

  // Create notification for client
  await createNotification(
    project.clientId,
    'programmer_left',
    'Programmer Left Project',
    `${req.user.name} has left the project "${project.title}".`,
    project._id
  )

  const populated = await Project.findById(project._id)
    .populate('clientId', 'name email status')
    .populate('assignedProgrammerId', 'name email skills bio hourlyRate status')
    .populate('assignedProgrammerIds', 'name email status')

  res.json(populated)
})

// @desc    Remove a programmer from the project (client owner or admin)
// @route   POST /api/assignments/:projectId/remove-programmer
// @access  Private (client owner or admin)
export const removeProgrammerFromProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params
  const { programmerId } = req.body

  if (!programmerId) {
    res.status(400)
    throw new Error('programmerId is required')
  }

  const project = await Project.findById(projectId)
  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  const clientIdStr = (project.clientId?._id || project.clientId)?.toString()
  const isClientOwner = clientIdStr && clientIdStr === req.user._id.toString()
  const isAdmin = req.user.role === 'admin'
  if (!isClientOwner && !isAdmin) {
    res.status(403)
    throw new Error('Only the project client or an admin can remove a programmer from the project')
  }

  const userId = programmerId.toString()

  const isPrimaryAssigned = project.assignedProgrammerId &&
    project.assignedProgrammerId.toString() === userId
  const isInTeam = project.assignedProgrammerIds &&
    project.assignedProgrammerIds.some((id) => id.toString() === userId)

  if (!isPrimaryAssigned && !isInTeam) {
    res.status(404)
    throw new Error('Programmer is not assigned to this project')
  }

  if (isPrimaryAssigned) {
    project.assignedProgrammerId = null
    if (project.assignedProgrammerIds && project.assignedProgrammerIds.length > 0) {
      const remaining = project.assignedProgrammerIds.filter((id) => id.toString() !== userId)
      if (remaining.length > 0) {
        project.assignedProgrammerId = remaining[0]
        project.assignedProgrammerIds = remaining.slice(1)
      } else {
        project.assignedProgrammerIds = []
      }
    }
  } else if (isInTeam) {
    project.assignedProgrammerIds = project.assignedProgrammerIds.filter(
      (id) => id.toString() !== userId
    )
  }

  if (
    !project.assignedProgrammerId &&
    (!project.assignedProgrammerIds || project.assignedProgrammerIds.length === 0)
  ) {
    project.status = 'Ready'
  }

  await project.save()

  await createNotification(
    programmerId,
    'removed_from_project',
    'Removed from Project',
    `You have been removed from the project "${project.title}".`,
    project._id
  )

  const populated = await Project.findById(project._id)
    .populate('clientId', 'name email status')
    .populate('assignedProgrammerId', 'name email skills bio hourlyRate status')
    .populate('assignedProgrammerIds', 'name email status')

  res.json(populated)
})
