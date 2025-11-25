import Notification from '../models/Notification.js'
import asyncHandler from 'express-async-handler'

// @desc    Get all notifications for current user
// @route   GET /api/notifications
// @access  Private
export const getNotifications = asyncHandler(async (req, res) => {
  const { unreadOnly } = req.query

  const filter = { userId: req.user._id }
  if (unreadOnly === 'true') {
    filter.isRead = false
  }

  const notifications = await Notification.find(filter)
    .populate('projectId', 'title status')
    .sort({ createdAt: -1 })
    .limit(50)

  res.json(notifications)
})

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    userId: req.user._id,
    isRead: false,
  })

  res.json({ unreadCount: count })
})

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id)

  if (!notification) {
    res.status(404)
    throw new Error('Notification not found')
  }

  if (
    notification.userId.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    res.status(403)
    throw new Error('Not authorized to update this notification')
  }

  notification.isRead = true
  notification.readAt = new Date()
  await notification.save()

  res.json(notification)
})

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  )

  res.json({ message: 'All notifications marked as read' })
})

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id)

  if (!notification) {
    res.status(404)
    throw new Error('Notification not found')
  }

  if (
    notification.userId.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    res.status(403)
    throw new Error('Not authorized to delete this notification')
  }

  await notification.deleteOne()

  res.json({ message: 'Notification deleted successfully' })
})

// Helper function to create notifications (used by other controllers)
export const createNotification = async (userId, type, title, message, projectId = null) => {
  try {
    await Notification.create({
      userId,
      projectId,
      type,
      title,
      message,
      isRead: false,
    })
  } catch (error) {
    console.error('Error creating notification:', error)
  }
}