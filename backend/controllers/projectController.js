import Project from '../models/Project.js'
import ProjectNote from '../models/ProjectNote.js'
import asyncHandler from 'express-async-handler'
import { Op } from 'sequelize'

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
export const createProject = asyncHandler(async (req, res) => {
  const projectData = {
    ...req.body,
    clientId: req.user.id,
    status: 'Holding', // New projects start as Holding
  }

  const project = await Project.create(projectData)

  // Reload with associations
  const projectWithAssociations = await Project.findByPk(project.id, {
    include: [
      { association: 'client', attributes: ['id', 'name', 'email'] },
      { 
        association: 'assignedProgrammer', 
        attributes: ['id', 'name', 'email', 'skills', 'bio', 'hourlyRate']
      }
    ]
  })

  res.status(201).json(projectWithAssociations)
})

// @desc    Get all projects (filtered by user role)
// @route   GET /api/projects
// @access  Private
export const getProjects = asyncHandler(async (req, res) => {
  let where = {}

  // Users see only their projects
  if (req.user.role === 'user') {
    where.clientId = req.user.id
  }
  // Programmers see projects assigned to them or available projects (Ready status)
  else if (req.user.role === 'programmer') {
    where[Op.or] = [
      { assignedProgrammerId: req.user.id },
      { assignedProgrammerId: null, status: 'Ready' },
    ]
  }
  // Admins see all projects (where remains empty)

  const projects = await Project.findAll({
    where,
    include: [
      { association: 'client', attributes: ['id', 'name', 'email'] },
      { 
        association: 'assignedProgrammer', 
        attributes: ['id', 'name', 'email', 'skills', 'bio', 'hourlyRate']
      }
    ],
    order: [['createdAt', 'DESC']]
  })

  res.json(projects)
})

// @desc    Get current user's projects
// @route   GET /api/projects/my-projects
// @access  Private
export const getMyProjects = asyncHandler(async (req, res) => {
  const projects = await Project.findAll({
    where: { clientId: req.user.id },
    include: [
      { 
        association: 'assignedProgrammer', 
        attributes: ['id', 'name', 'email', 'skills', 'bio', 'hourlyRate']
      }
    ],
    order: [['createdAt', 'DESC']]
  })

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

  const projects = await Project.findAll({
    where: { assignedProgrammerId: req.user.id },
    include: [
      { association: 'client', attributes: ['id', 'name', 'email'] }
    ],
    order: [['createdAt', 'DESC']]
  })

  res.json(projects)
})

// @desc    Get project by ID
// @route   GET /api/projects/:id
// @access  Private
export const getProjectById = asyncHandler(async (req, res) => {
  const project = await Project.findByPk(req.params.id, {
    include: [
      { association: 'client', attributes: ['id', 'name', 'email'] },
      { 
        association: 'assignedProgrammer', 
        attributes: ['id', 'name', 'email', 'skills', 'bio', 'hourlyRate']
      },
      { 
        association: 'notes',
        include: [{ association: 'user', attributes: ['id', 'name', 'email'] }],
        order: [['createdAt', 'DESC']]
      }
    ]
  })

  if (project) {
    res.json(project)
  } else {
    res.status(404)
    throw new Error('Project not found')
  }
})

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
export const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findByPk(req.params.id)

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  // Users can only update their own projects if status is Holding or Ready
  if (req.user.role === 'user') {
    if (project.clientId !== req.user.id) {
      res.status(403)
      throw new Error('Not authorized to update this project')
    }
    if (!['Holding', 'Ready'].includes(project.status)) {
      res.status(403)
      throw new Error('Cannot update project in current status')
    }
  }

  // Update project fields
  Object.keys(req.body).forEach((key) => {
    if (req.body[key] !== undefined && key !== 'id' && key !== 'clientId') {
      // Map camelCase to snake_case for database fields
      const dbKey = key === 'assignedProgrammerId' ? 'assignedProgrammerId' :
                   key === 'projectType' ? 'projectType' :
                   key === 'designStyles' ? 'designStyles' :
                   key === 'hasBranding' ? 'hasBranding' :
                   key === 'brandingDetails' ? 'brandingDetails' :
                   key === 'contentStatus' ? 'contentStatus' :
                   key === 'referenceWebsites' ? 'referenceWebsites' :
                   key === 'specialRequirements' ? 'specialRequirements' :
                   key === 'additionalComments' ? 'additionalComments' :
                   key === 'startDate' ? 'startDate' :
                   key === 'dueDate' ? 'dueDate' :
                   key === 'completedDate' ? 'completedDate' : key
      project[dbKey] = req.body[key]
    }
  })

  const updatedProject = await project.save()

  // Reload with associations
  const projectWithAssociations = await Project.findByPk(updatedProject.id, {
    include: [
      { association: 'client', attributes: ['id', 'name', 'email'] },
      { 
        association: 'assignedProgrammer', 
        attributes: ['id', 'name', 'email', 'skills', 'bio', 'hourlyRate']
      }
    ]
  })

  res.json(projectWithAssociations)
})

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
export const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findByPk(req.params.id)

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  // Only users can delete their own projects, and only if in Holding status
  if (req.user.role === 'user') {
    if (project.clientId !== req.user.id) {
      res.status(403)
      throw new Error('Not authorized to delete this project')
    }
    if (project.status !== 'Holding') {
      res.status(403)
      throw new Error('Can only delete projects in Holding status')
    }
  }

  await project.destroy()

  res.json({ message: 'Project removed' })
})

// @desc    Mark project as Ready for assignment
// @route   PUT /api/projects/:id/ready
// @access  Private
export const markProjectReady = asyncHandler(async (req, res) => {
  const project = await Project.findByPk(req.params.id)

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  // Only user or admin can mark project as ready
  if (req.user.role === 'user' && project.clientId !== req.user.id) {
    res.status(403)
    throw new Error('Not authorized to update this project')
  }

  if (project.status !== 'Holding') {
    res.status(400)
    throw new Error('Project must be in Holding status to mark as Ready')
  }

  project.status = 'Ready'
  const updatedProject = await project.save()

  // Reload with associations
  const projectWithAssociations = await Project.findByPk(updatedProject.id, {
    include: [
      { association: 'client', attributes: ['id', 'name', 'email'] },
      { 
        association: 'assignedProgrammer', 
        attributes: ['id', 'name', 'email', 'skills', 'bio', 'hourlyRate']
      }
    ]
  })

  res.json(projectWithAssociations)
})
