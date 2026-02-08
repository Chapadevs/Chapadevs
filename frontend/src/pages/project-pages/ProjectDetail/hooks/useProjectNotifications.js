import { useNotifications } from '../../../../context/NotificationContext'

export const useProjectNotifications = (project) => {
  const { notifications } = useNotifications()

  // Filter notifications for this project and determine which tabs should show badges
  const projectIdStr = project ? (project._id || project.id)?.toString() : null
  const projectNotifications = projectIdStr ? notifications.filter((notif) => {
    const notifProjectId = (notif.projectId?._id || notif.projectId)?.toString()
    return notifProjectId === projectIdStr && !notif.isRead
  }) : []

  // Map notification types to relevant tabs
  const getRelevantTabs = (notificationType) => {
    switch (notificationType) {
      case 'project_assigned':
      case 'project_accepted':
        return ['programmers', 'timeline'] // Relevant to Team and Development Progress
      case 'project_updated':
      case 'project_completed':
        return ['timeline'] // Relevant to Development Progress
      case 'message_received':
        return ['comments'] // Relevant to Comments
      case 'system':
        return ['timeline'] // System notifications usually relate to progress
      default:
        return ['timeline'] // Default to Development Progress
    }
  }

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
  const hasCommentsNotifications = tabsWithNotifications.has('comments')

  return {
    projectNotifications,
    tabsWithNotifications,
    hasDescriptionNotifications,
    hasAIPreviewNotifications,
    hasProgrammersNotifications,
    hasTimelineNotifications,
    hasCommentsNotifications,
  }
}
