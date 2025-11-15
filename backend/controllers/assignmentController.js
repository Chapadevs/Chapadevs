import Project from '../models/Project.js'
import asyncHandler from 'express-async-handler'

// @desc    Get available projects (not assigned)
// @route   GET /api/assignments/available
// @access  Private/Programmer
export const getAvailableProjects = asyncHandler(async (req, res) => {
  const projects = await Project.findAll({
    where: {
      assignedProgrammerId: null,
      status: ['pending', 'draft']
    },
    include: [
      { association: 'client', attributes: ['id', 'name', 'email', 'company'] }
    ],
    order: [['createdAt', 'DESC']]
  })

  res.json(projects)
})

// @desc    Assign project to programmer
// @route   POST /api/assignments/:projectId/assign
// @access  Private/Programmer
export const assignProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params
  const { programmerId } = req.body

  const project = await Project.findByPk(projectId)

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  if (project.assignedProgrammerId) {
    res.status(400)
    throw new Error('Project is already assigned')
  }

  project.assignedProgrammerId = programmerId || req.user.id
  project.status = 'in-progress'

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

// @desc    Accept project assignment
// @route   POST /api/assignments/:projectId/accept
// @access  Private/Programmer
export const acceptProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params

  const project = await Project.findByPk(projectId)

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  if (project.assignedProgrammerId && project.assignedProgrammerId !== req.user.id) {
    res.status(403)
    throw new Error('Not authorized to accept this project')
  }

  project.assignedProgrammerId = req.user.id
  project.status = 'in-progress'
  project.startDate = new Date()

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

// @desc    Reject project assignment
// @route   POST /api/assignments/:projectId/reject
// @access  Private/Programmer
export const rejectProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params

  const project = await Project.findByPk(projectId)

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  project.assignedProgrammerId = null
  project.status = 'pending'

  const updatedProject = await project.save()

  res.json(updatedProject)
})

// @desc    Unassign project
// @route   DELETE /api/assignments/:projectId/unassign
// @access  Private/Programmer
export const unassignProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params

  const project = await Project.findByPk(projectId)

  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  if (project.assignedProgrammerId && project.assignedProgrammerId !== req.user.id) {
    res.status(403)
    throw new Error('Not authorized to unassign this project')
  }

  project.assignedProgrammerId = null
  project.status = 'pending'

  const updatedProject = await project.save()

  res.json(updatedProject)
})
