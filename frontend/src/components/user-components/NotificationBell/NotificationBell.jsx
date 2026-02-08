import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../../../context/NotificationContext'
import './NotificationBell.css'

const NotificationBell = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadNotifications,
  } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      loadNotifications()
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, loadNotifications])

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await markAsRead(notification._id || notification.id)
      } catch (error) {
        console.error('Error marking notification as read:', error)
      }
    }

    // Navigate to relevant page
    if (notification.projectId) {
      navigate(`/projects/${notification.projectId._id || notification.projectId}`)
    } else {
      navigate('/dashboard')
    }
    setIsOpen(false)
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const handleDelete = async (e, notificationId) => {
    e.stopPropagation()
    try {
      await deleteNotification(notificationId)
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const renderMessageWithHighlight = (message) => {
    if (!message || typeof message !== 'string') return message
    const parts = message.split(/"([^"]*)"/)
    return parts.map((part, i) =>
      i % 2 === 1 ? (
        <span key={i} className="notification-item-message-project">{part}</span>
      ) : (
        part
      )
    )
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const recentNotifications = notifications.slice(0, 10)

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        className="notification-bell-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <svg
          className="notification-bell-icon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && (
          <span className="notification-bell-badge" aria-label={`${unreadCount} unread notifications`} />
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h3>Notifications</h3>
          </div>
          {unreadCount > 0 && (
            <button
              className="notification-mark-all-read"
              onClick={handleMarkAllAsRead}
              title="Mark all as read"
            >
              Mark all as read
            </button>
          )}

          <div className="notification-list">
            {recentNotifications.length === 0 ? (
              <div className="notification-empty">No notifications</div>
            ) : (
              recentNotifications.map((notification) => {
                const notifId = notification._id || notification.id
                const isUnread = !notification.isRead
                return (
                  <div
                    key={notifId}
                    className={`notification-item ${isUnread ? 'notification-item--unread' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="notification-item-content">
                      <div className="notification-item-header">
                        <h4 className="notification-item-title">
                          {notification.title.startsWith('New message in ') ? (
                            <>
                              <span className="notification-item-title-prefix">New message in </span>
                              <span className="notification-item-title-project">
                                {notification.projectId?.title ?? notification.title.slice(14)}
                              </span>
                            </>
                          ) : (
                            notification.title
                          )}
                        </h4>
                        {isUnread && <span className="notification-item-unread-dot"></span>}
                      </div>
                      <p className="notification-item-message">{renderMessageWithHighlight(notification.message)}</p>
                      <div className="notification-item-footer">
                        <span className="notification-item-time">
                          {formatDate(notification.createdAt || notification.created_at)}
                        </span>
                        <button
                          className="notification-item-delete"
                          onClick={(e) => handleDelete(e, notifId)}
                          title="Delete notification"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {notifications.length > 10 && (
            <div className="notification-dropdown-footer">
              <button
                className="notification-view-all"
                onClick={() => {
                  navigate('/dashboard')
                  setIsOpen(false)
                }}
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationBell
