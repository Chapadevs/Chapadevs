import express from 'express'
import {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getProgrammers,
  updateStatus,
  getUserStatuses,
  getUserProfile,
} from '../controllers/userController.js'
import { protect, authorize } from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes are protected
router.use(protect)

// Get all programmers (for project assignment)
router.get('/programmers', getProgrammers)

// User status routes (all authenticated users)
router.put('/status', updateStatus)
router.post('/statuses', getUserStatuses)

// Public profile viewing (for collaborators) - must be before /:id route
router.get('/:id/profile', getUserProfile)

// Admin only routes
router.get('/', authorize('admin'), getUsers)
router
  .route('/:id')
  .get(authorize('admin'), getUserById)
  .put(authorize('admin'), updateUser)
  .delete(authorize('admin'), deleteUser)

export default router

