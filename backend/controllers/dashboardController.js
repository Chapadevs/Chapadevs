import Project from '../models/Project.js'
import AIPreview from '../models/AIPreview.js'
import Notification from '../models/Notification.js'
import SupportTicket from '../models/SupportTicket.js'
import asyncHandler from 'express-async-handler'

// @desc    Get dashboard data for current user
// @route   GET /api/dashboard
// @access  Private
export const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id
  const userRole = req.user.role

  const projectFilter =
    userRole === 'user'
      ? { clientId: userId }
      : userRole === 'programmer'
      ? { assignedProgrammerId: userId }
      : {}

  const projects = await Project.find(projectFilter)
    .populate('clientId', 'name email')
    .populate('assignedProgrammerId', 'name email skills bio hourlyRate')
    .sort({ createdAt: -1 })
    .limit(10)

  const projectStatsRaw = await Project.aggregate([
    { $match: projectFilter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ])

  const unreadNotificationsCount = await Notification.countDocuments({
    userId,
    isRead: false,
  })

  const recentNotifications = await Notification.find({ userId })
    .populate('projectId', 'title')
    .sort({ createdAt: -1 })
    .limit(5)

  const recentAIPreviews = await AIPreview.find({ userId })
    .populate('projectId', 'title')
    .sort({ createdAt: -1 })
    .limit(5)

  const openTicketsCount = await SupportTicket.countDocuments({
    userId,
    status: { $in: ['open', 'in_progress'] },
  })

  const stats = {
    total: 0,
    holding: 0,
    ready: 0,
    development: 0,
    completed: 0,
    cancelled: 0,
  }

  projectStatsRaw.forEach((stat) => {
    const count = stat.count || 0
    stats.total += count
    const key = (stat._id || '').toLowerCase()
    if (key === 'holding') stats.holding = count
    if (key === 'ready') stats.ready = count
    if (key === 'development') stats.development = count
    if (key === 'completed') stats.completed = count
    if (key === 'cancelled') stats.cancelled = count
  })

  res.json({
    projects,
    stats,
    notifications: {
      unreadCount: unreadNotificationsCount,
      recent: recentNotifications,
    },
    aiPreviews: {
      recent: recentAIPreviews,
    },
    support: {
      openTicketsCount,
    },
  })
})
