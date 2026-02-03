import express from 'express'
import {
  getMessages,
  sendMessage,
  markAsRead,
} from '../controllers/chatController.js'
import { protect, authorizeProjectAccess } from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes are protected and require project access
router.use(protect)

// Get messages for a project
router.get('/:id/messages', authorizeProjectAccess, getMessages)

// Send a message in a project
router.post('/:id/messages', authorizeProjectAccess, sendMessage)

// Mark all messages in a project as read
router.put('/:id/messages/read', authorizeProjectAccess, markAsRead)

export default router
