import express from 'express'
import {
  assignProject,
  unassignProject,
  getAvailableProjects,
  acceptProject,
  rejectProject,
} from '../controllers/assignmentController.js'
import { protect, authorize } from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes are protected
router.use(protect)

// Programmer routes - view and manage assignments
router.get('/available', authorize('programmer', 'admin'), getAvailableProjects)
router.post('/:projectId/assign', authorize('programmer', 'admin'), assignProject)
router.post('/:projectId/accept', authorize('programmer', 'admin'), acceptProject)
router.post('/:projectId/reject', authorize('programmer', 'admin'), rejectProject)
router.delete('/:projectId/unassign', authorize('programmer', 'admin'), unassignProject)

export default router

