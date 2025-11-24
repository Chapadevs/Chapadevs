import SupportTicket from '../models/SupportTicket.js'
import asyncHandler from 'express-async-handler'

// @desc    Create support ticket
// @route   POST /api/support
// @access  Private
export const createSupportTicket = asyncHandler(async (req, res) => {
  const { subject, message, category, priority } = req.body

  if (!subject || !message) {
    res.status(400)
    throw new Error('Please provide subject and message')
  }

  const ticket = await SupportTicket.create({
    userId: req.user.id,
    subject,
    message,
    category: category || 'general',
    priority: priority || 'medium',
    status: 'open'
  })

  res.status(201).json(ticket)
})

// @desc    Get all support tickets for current user
// @route   GET /api/support
// @access  Private
export const getSupportTickets = asyncHandler(async (req, res) => {
  // Users see only their tickets, admins see all
  const where = req.user.role === 'admin' ? {} : { userId: req.user.id }

  const tickets = await SupportTicket.findAll({
    where,
    include: [
      {
        association: 'user',
        attributes: ['id', 'name', 'email'],
        required: false
      }
    ],
    order: [['createdAt', 'DESC']]
  })

  res.json(tickets)
})

// @desc    Get support ticket by ID
// @route   GET /api/support/:id
// @access  Private
export const getSupportTicketById = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findByPk(req.params.id, {
    include: [
      {
        association: 'user',
        attributes: ['id', 'name', 'email'],
        required: false
      }
    ]
  })

  if (!ticket) {
    res.status(404)
    throw new Error('Support ticket not found')
  }

  // Verify ownership (users can only see their own, admins can see all)
  if (ticket.userId !== req.user.id && req.user.role !== 'admin') {
    res.status(403)
    throw new Error('Not authorized to view this ticket')
  }

  res.json(ticket)
})

// @desc    Update support ticket (admin can respond/resolve)
// @route   PUT /api/support/:id
// @access  Private
export const updateSupportTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findByPk(req.params.id)

  if (!ticket) {
    res.status(404)
    throw new Error('Support ticket not found')
  }

  // Users can only update their own tickets (add messages), admins can update any
  if (ticket.userId !== req.user.id && req.user.role !== 'admin') {
    res.status(403)
    throw new Error('Not authorized to update this ticket')
  }

  // Users can add messages, admins can respond and change status
  if (req.user.role === 'admin') {
    if (req.body.adminResponse !== undefined) {
      ticket.adminResponse = req.body.adminResponse
    }
    if (req.body.status !== undefined) {
      ticket.status = req.body.status
      if (req.body.status === 'resolved' || req.body.status === 'closed') {
        ticket.resolvedAt = new Date()
      }
    }
    if (req.body.priority !== undefined) {
      ticket.priority = req.body.priority
    }
  } else {
    // Users can add follow-up messages
    if (req.body.message !== undefined) {
      ticket.message += `\n\n--- Follow-up ---\n${req.body.message}`
    }
  }

  const updatedTicket = await ticket.save()

  res.json(updatedTicket)
})

// @desc    Delete support ticket
// @route   DELETE /api/support/:id
// @access  Private/Admin
export const deleteSupportTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findByPk(req.params.id)

  if (!ticket) {
    res.status(404)
    throw new Error('Support ticket not found')
  }

  // Only admins can delete tickets
  if (req.user.role !== 'admin') {
    res.status(403)
    throw new Error('Not authorized to delete tickets')
  }

  await ticket.destroy()

  res.json({ message: 'Support ticket deleted successfully' })
})

