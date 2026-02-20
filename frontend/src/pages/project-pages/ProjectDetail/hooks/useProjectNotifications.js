import { useCallback } from 'react'
import { useNotifications } from '../../../../context/NotificationContext'

// Map notification types to relevant tabs (shared for filtering and mark-as-read)
const getRelevantTabs = (notificationType) => {
  switch (notificationType) {
    case 'project_assigned':
    case 'project_accepted':
      return ['programmers', 'timeline', 'activity']
    case 'project_updated':
    case 'project_completed':
      return ['timeline', 'activity']
    case 'programmer_left':
    case 'removed_from_project':
      return ['programmers', 'activity']
    case 'message_received':
      return ['comments']
    case 'system':
      return ['timeline', 'activity']
    default:
      return ['timeline', 'activity']
  }
}

export const useProjectNotifications = (project) => {
  const { notifications, markNotificationsAsRead } = useNotifications()

  // Filter notifications for this project and determine which tabs should show badges
  const projectIdStr = project ? (project._id || project.id)?.toString() : null
  const projectNotifications = projectIdStr ? notifications.filter((notif) => {
    const notifProjectId = (notif.projectId?._id || notif.projectId)?.toString()
    return notifProjectId === projectIdStr && !notif.isRead
  }) : []

  // Determine which tabs have relevant notifications
  const tabsWithNotifications = new Set()
  projectNotifications.forEach((notif) => {
    const relevantTabs = getRelevantTabs(notif.type)
    relevantTabs.forEach((tab) => tabsWithNotifications.add(tab))
  })

  const hasDescriptionNotifications = tabsWithNotifications.has('description')
  const hasAIPreviewNotifications = tabsWithNotifications.has('ai-preview')
  const hasProgrammersNotifications = tabsWithNotifications.has('programmers')
  const hasTimelineNotifications = tabsWithNotifications.has('timeline')
  const hasActivityNotifications = tabsWithNotifications.has('activity')
  const hasCommentsNotifications = tabsWithNotifications.has('comments')

  // Mark all unread notifications for this project that are relevant to the given tab as read
  const markTabAsRead = useCallback((tabId) => {
    if (!projectIdStr) return
    const ids = projectNotifications
      .filter((notif) => getRelevantTabs(notif.type).includes(tabId))
      .map((n) => n._id || n.id)
    if (ids.length > 0) markNotificationsAsRead(ids)
  }, [projectIdStr, projectNotifications, markNotificationsAsRead])

  // Mark all unread notifications for this project as read
  const markProjectAsRead = useCallback(() => {
    if (!projectIdStr) return
    const ids = projectNotifications.map((n) => n._id || n.id)
    if (ids.length > 0) markNotificationsAsRead(ids)
  }, [projectIdStr, projectNotifications, markNotificationsAsRead])

  return {
    projectNotifications,
    tabsWithNotifications,
    hasDescriptionNotifications,
    hasAIPreviewNotifications,
    hasProgrammersNotifications,
    hasTimelineNotifications,
    hasActivityNotifications,
    hasCommentsNotifications,
    markTabAsRead,
    markProjectAsRead,
  }
}
