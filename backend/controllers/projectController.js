import Project from '../models/Project.js'
import ProjectNote from '../models/ProjectNote.js'
import asyncHandler from 'express-async-handler'

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

  const notes = await ProjectNote.find({ projectId: project._id })
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .lean()

  res.json({ ...project, notes })
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

  if (req.user.role === 'user') {
    if (project.clientId.toString() !== req.user._id.toString()) {
      res.status(403)
      throw new Error('Not authorized to delete this project')
    }
    if (project.status !== 'Holding') {
      res.status(403)
      throw new Error('Can only delete projects in Holding status')
    }
  }

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
