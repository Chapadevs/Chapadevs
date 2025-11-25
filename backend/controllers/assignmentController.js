import Project from '../models/Project.js'
import { createNotification } from './notificationController.js'
import asyncHandler from 'express-async-handler'

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

  res.json(project)
})
