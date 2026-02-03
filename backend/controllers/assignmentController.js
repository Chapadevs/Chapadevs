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

// @desc    Get available projects (not assigned, status Ready)
// @route   GET /api/assignments/available
// @access  Private/Programmer
export const getAvailableProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find({
    assignedProgrammerId: null,
    status: 'Ready',
  })
    .populate('clientId', 'name email')
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

  project.assignedProgrammerId = programmerId || req.user._id
  project.status = 'Development'
  project.startDate = new Date()

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
    .populate('clientId', 'name email')
    .populate('assignedProgrammerId', 'name email skills bio hourlyRate')

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

  if (
    project.assignedProgrammerId &&
    project.assignedProgrammerId.toString() !== req.user._id.toString()
  ) {
    res.status(403)
    throw new Error('Not authorized to accept this project')
  }

  if (project.status !== 'Ready') {
    res.status(400)
    throw new Error('Project must be in Ready status to be accepted')
  }

  project.assignedProgrammerId = req.user._id
  project.status = 'Development'
  project.startDate = new Date()

  await project.save()
  await createPhasesForProject(project)

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
