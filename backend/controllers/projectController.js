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
    status: 'draft', // New projects start as draft
  }

  const project = await Project.create(projectData)

  // Reload with associations
  const projectWithAssociations = await Project.findByPk(project.id, {
    include: [
      { association: 'client', attributes: ['id', 'name', 'email', 'company'] },
      { association: 'assignedProgrammer', attributes: ['id', 'name', 'email', 'skills'] }
    ]
  })

  res.status(201).json(projectWithAssociations)
})

// @desc    Get all projects (filtered by user role)
// @route   GET /api/projects
// @access  Private
export const getProjects = asyncHandler(async (req, res) => {
  let where = {}

  // Clients see only their projects
  if (req.user.role === 'client') {
    where.clientId = req.user.id
  }
  // Programmers see projects assigned to them or available projects
  else if (req.user.role === 'programmer') {
    where[Op.or] = [
      { assignedProgrammerId: req.user.id },
      { assignedProgrammerId: null, status: 'pending' },
    ]
  }
  // Admins see all projects (where remains empty)

  const projects = await Project.findAll({
    where,
    include: [
      { association: 'client', attributes: ['id', 'name', 'email', 'company'] },
      { association: 'assignedProgrammer', attributes: ['id', 'name', 'email', 'skills'] }
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
      { association: 'assignedProgrammer', attributes: ['id', 'name', 'email', 'skills'] }
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
      { association: 'client', attributes: ['id', 'name', 'email', 'company', 'phone'] }
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
      { association: 'client', attributes: ['id', 'name', 'email', 'company', 'phone'] },
      { association: 'assignedProgrammer', attributes: ['id', 'name', 'email', 'skills', 'bio'] },
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

  // Clients can only update their own projects if status is draft or pending
  if (req.user.role === 'client') {
    if (project.clientId !== req.user.id) {
      res.status(403)
      throw new Error('Not authorized to update this project')
    }
    if (!['draft', 'pending'].includes(project.status)) {
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
      { association: 'client', attributes: ['id', 'name', 'email', 'company'] },
      { association: 'assignedProgrammer', attributes: ['id', 'name', 'email', 'skills'] }
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

  // Only clients can delete their own projects, and only if in draft status
  if (req.user.role === 'client') {
    if (project.clientId !== req.user.id) {
      res.status(403)
      throw new Error('Not authorized to delete this project')
    }
    if (project.status !== 'draft') {
      res.status(403)
      throw new Error('Can only delete projects in draft status')
    }
  }

  await project.destroy()

  res.json({ message: 'Project removed' })
})
