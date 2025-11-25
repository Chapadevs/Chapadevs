import Project from '../models/Project.js'
import AIPreview from '../models/AIPreview.js'
import Notification from '../models/Notification.js'
import SupportTicket from '../models/SupportTicket.js'
import asyncHandler from 'express-async-handler'
import { Op } from 'sequelize'

// @desc    Get dashboard data for current user
// @route   GET /api/dashboard
// @access  Private
export const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user.id
  const userRole = req.user.role

  // Get projects
  const projectsWhere = userRole === 'user' 
    ? { clientId: userId }
    : userRole === 'programmer'
    ? { assignedProgrammerId: userId }
    : {}

  const projects = await Project.findAll({
    where: projectsWhere,
    include: [
      { association: 'client', attributes: ['id', 'name', 'email'] },
      { 
        association: 'assignedProgrammer', 
        attributes: ['id', 'name', 'email', 'skills', 'bio', 'hourlyRate']
      }
    ],
    order: [['createdAt', 'DESC']],
    limit: 10 // Recent 10 projects
  })

  // Get project statistics
  const projectStats = await Project.findAll({
    where: projectsWhere,
    attributes: [
      'status',
      [Project.sequelize.fn('COUNT', Project.sequelize.col('id')), 'count']
    ],
    group: ['status'],
    raw: true
  })

  // Get unread notifications count
  const unreadNotificationsCount = await Notification.count({
    where: {
      userId: userId,
      isRead: false
    }
  })

  // Get recent notifications (last 5)
  const recentNotifications = await Notification.findAll({
    where: { userId: userId },
    include: [
      {
        association: 'project',
        attributes: ['id', 'title'],
        required: false
      }
    ],
    order: [['createdAt', 'DESC']],
    limit: 5
  })

  // Get recent AI previews (last 5)
  const recentAIPreviews = await AIPreview.findAll({
    where: { userId: userId },
    include: [
      {
        association: 'project',
        attributes: ['id', 'title'],
        required: false
      }
    ],
    order: [['createdAt', 'DESC']],
    limit: 5
  })

  // Get open support tickets count
  const openTicketsCount = await SupportTicket.count({
    where: {
      userId: userId,
      status: { [Op.in]: ['open', 'in_progress'] }
    }
  })

  // Format project stats
  const stats = {
    total: 0,
    holding: 0,
    ready: 0,
    development: 0,
    completed: 0,
    cancelled: 0
  }

  projectStats.forEach(stat => {
    const count = parseInt(stat.count)
    stats.total += count
    stats[stat.status.toLowerCase()] = count
  })

  res.json({
    projects: projects,
    stats: stats,
    notifications: {
      unreadCount: unreadNotificationsCount,
      recent: recentNotifications
    },
    aiPreviews: {
      recent: recentAIPreviews
    },
    support: {
      openTicketsCount: openTicketsCount
    }
  })
})


