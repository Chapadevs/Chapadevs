import Message from '../models/Message.js'
import Project from '../models/Project.js'
import { createNotification } from './notificationController.js'
import websocketService from '../services/websocket.js'
import { uploadChatAttachment } from '../utils/projectAttachmentStorage.js'
import asyncHandler from 'express-async-handler'

// @desc    Upload a chat attachment (returns URL for use in sendMessage)
// @route   POST /api/projects/:id/chat-attachments
// @access  Private (authorizeProjectAccess middleware)
export const uploadChatAttachmentHandler = asyncHandler(async (req, res) => {
  const projectId = req.params.id || req.params.projectId
  if (!req.file) {
    res.status(400)
    throw new Error('No file uploaded')
  }
  if (req.file.size > 10 * 1024 * 1024) {
    res.status(400)
    throw new Error('File size must be less than 10MB')
  }
  const gcsUrl = await uploadChatAttachment(
    projectId,
    req.file.buffer,
    req.file.originalname,
    req.file.mimetype || 'application/octet-stream'
  )
  res.status(201).json({
    url: gcsUrl,
    filename: req.file.originalname,
    type: req.file.mimetype || 'file',
  })
})

// @desc    Get messages for a project
// @route   GET /api/projects/:id/messages
// @access  Private (authorizeProjectAccess middleware)
export const getMessages = asyncHandler(async (req, res) => {
  const projectId = req.params.id || req.params.projectId
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 50
  const skip = (page - 1) * limit

  const messages = await Message.find({ projectId })
    .populate('senderId', 'name email role')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)

  // Reverse to show oldest first (for chat display)
  const reversedMessages = messages.reverse()

  res.json(reversedMessages)
})

// @desc    Send a message in a project
// @route   POST /api/projects/:id/messages
// @access  Private (authorizeProjectAccess middleware)
export const sendMessage = asyncHandler(async (req, res) => {
  const projectId = req.params.id || req.params.projectId
  const { content, attachments } = req.body
  const senderId = req.user._id

  const hasContent = content && String(content).trim().length > 0
  const validAttachments = Array.isArray(attachments)
    ? attachments.filter((a) => a && a.url && a.filename).slice(0, 5)
    : []

  if (!hasContent && validAttachments.length === 0) {
    res.status(400)
    throw new Error('Message content or at least one attachment is required')
  }

  if (content && content.length > 5000) {
    res.status(400)
    throw new Error('Message content cannot exceed 5000 characters')
  }

  const message = await Message.create({
    projectId,
    senderId,
    content: (content || '').trim(),
    attachments: validAttachments.map((a) => ({
      url: a.url,
      filename: a.filename,
      type: a.type || 'file',
    })),
    readBy: [senderId],
  })

  // Populate sender info
  const populatedMessage = await Message.findById(message._id).populate(
    'senderId',
    'name email role'
  )

  // Get project to find all participants
  const project = await Project.findById(projectId)
  if (!project) {
    res.status(404)
    throw new Error('Project not found')
  }

  // Collect all project participants (client + assigned programmers)
  const participants = new Set()
  if (project.clientId) {
    participants.add(project.clientId.toString())
  }
  if (project.assignedProgrammerId) {
    participants.add(project.assignedProgrammerId.toString())
  }
  if (project.assignedProgrammerIds && Array.isArray(project.assignedProgrammerIds)) {
    project.assignedProgrammerIds.forEach((id) => {
      participants.add(id.toString())
    })
  }

  // Broadcast message to all participants except sender
  websocketService.broadcastToProject(projectId, {
    type: 'chat_message',
    data: populatedMessage,
  }, senderId.toString())

  // Create notifications for all participants except sender
  const senderName = req.user.name || req.user.email
  const previewText = (content || '').trim() || (validAttachments.length > 0 ? `[${validAttachments.length} attachment(s)]` : '')
  participants.forEach((participantId) => {
    if (participantId !== senderId.toString()) {
      createNotification(
        participantId,
        'message_received',
        `New message in ${project.title}`,
        `${senderName}: ${previewText.substring(0, 100)}${previewText.length > 100 ? '...' : ''}`,
        projectId
      )
    }
  })

  res.status(201).json(populatedMessage)
})

// @desc    Mark all messages in a project as read
// @route   PUT /api/projects/:id/messages/read
// @access  Private (authorizeProjectAccess middleware)
export const markAsRead = asyncHandler(async (req, res) => {
  const projectId = req.params.id || req.params.projectId
  const userId = req.user._id

  // Update all messages in the project that haven't been read by this user
  const result = await Message.updateMany(
    {
      projectId,
      readBy: { $ne: userId },
    },
    {
      $addToSet: { readBy: userId },
    }
  )

  res.json({
    message: 'Messages marked as read',
    updatedCount: result.modifiedCount,
  })
})
