import express from 'express'
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getMyProjects,
  getAssignedProjects,
} from '../controllers/projectController.js'
import { protect, authorizeProjectAccess } from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes are protected
router.use(protect)

// Client routes - get their own projects
router.get('/my-projects', getMyProjects)

// Programmer routes - get assigned projects
router.get('/assigned', getAssignedProjects)

// General routes
router.post('/', createProject)
router.get('/', getProjects)
router
  .route('/:id')
  .get(authorizeProjectAccess, getProjectById)
  .put(authorizeProjectAccess, updateProject)
  .delete(authorizeProjectAccess, deleteProject)

export default router

