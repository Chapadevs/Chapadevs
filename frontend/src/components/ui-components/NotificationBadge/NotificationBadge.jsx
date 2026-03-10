import React from 'react'
import { useNotifications } from '../../../context/NotificationContext'

const NotificationBadge = ({ className = '' }) => {
  const { hasUnread } = useNotifications()

  if (!hasUnread) {
    return null
  }

  return (
    <span
      className={`inline-flex w-2 h-2 ml-2 align-middle rounded-full bg-green-600 animate-pulse ${className}`}
      aria-label="Unread notifications"
    />
  )
}

export default NotificationBadge
