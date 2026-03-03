import express from 'express'
import multer from 'multer'
import {
  getMessages,
  sendMessage,
  markAsRead,
  uploadChatAttachmentHandler,
} from '../controllers/chatController.js'
import { protect, authorizeProjectAccess } from '../middleware/authMiddleware.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
})

const router = express.Router()

// All routes are protected and require project access
router.use(protect)

// Upload chat attachment (returns URL for use in sendMessage)
router.post('/:id/chat-attachments', authorizeProjectAccess, upload.single('file'), uploadChatAttachmentHandler)

// Get messages for a project
router.get('/:id/messages', authorizeProjectAccess, getMessages)

// Send a message in a project
router.post('/:id/messages', authorizeProjectAccess, sendMessage)

// Mark all messages in a project as read
router.put('/:id/messages/read', authorizeProjectAccess, markAsRead)

export default router
