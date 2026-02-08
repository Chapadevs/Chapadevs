import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../../context/AuthContext'
import './UserStatus.css'

const UserStatus = () => {
  const { user, isAuthenticated } = useAuth()
  const [isOnline, setIsOnline] = useState(true)
  const lastActivityRef = useRef(Date.now())

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsOnline(false)
      return
    }

    // User is online if authenticated and page is visible
    const checkOnlineStatus = () => {
      const isPageVisible = !document.hidden
      const timeSinceLastActivity = Date.now() - lastActivityRef.current
      // Consider offline if page hidden for more than 5 minutes
      const isActive = isPageVisible && timeSinceLastActivity < 300000
      setIsOnline(isActive)
    }

    // Update last activity on user interaction
    const updateActivity = () => {
      lastActivityRef.current = Date.now()
      if (!document.hidden) {
        setIsOnline(true)
      }
    }

    // Check on mount
    checkOnlineStatus()

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach((event) => {
      document.addEventListener(event, updateActivity, { passive: true })
    })

    // Listen for visibility changes
    const handleVisibilityChange = () => {
      checkOnlineStatus()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Periodic check
    const interval = setInterval(checkOnlineStatus, 30000) // Check every 30 seconds

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, updateActivity)
      })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(interval)
    }
  }, [user, isAuthenticated])

  // Show for all authenticated users
  if (!user) {
    return null
  }

  return (
    <div className="user-status-container">
      <div className="online-status">
        <h3>Online Status</h3>
        <div className="online-status-indicator">
          <span className="online-status-label">Status:</span>
          <div className="online-status-badge-wrapper">
            <span className={`online-status-badge ${isOnline ? 'online' : 'offline'}`}>
              {isOnline ? '●' : '○'}
            </span>
            <span className="online-status-text">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserStatus

