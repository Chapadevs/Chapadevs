import React from 'react'
import { useNotifications } from '../../../context/NotificationContext'
import './NotificationBadge.css'

const NotificationBadge = ({ className = '' }) => {
  const { hasUnread } = useNotifications()

  if (!hasUnread) {
    return null
  }

  return <span className={`notification-badge ${className}`} aria-label="Unread notifications"></span>
}

export default NotificationBadge
