import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { userAPI } from '../../services/api'
import './UserStatusDropdown.css'

const STATUS_OPTIONS = [
  { value: 'online', label: 'Online', color: '#4caf50', icon: '●' },
  { value: 'away', label: 'Away', color: '#ff9800', icon: '○' },
  { value: 'busy', label: 'Busy', color: '#f44336', icon: '●' },
  { value: 'offline', label: 'Offline', color: '#9e9e9e', icon: '○' },
]

const UserStatusDropdown = () => {
  const { user, isAuthenticated } = useAuth()
  const [status, setStatus] = useState('online')
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return
    }

    // Load status from backend
    const loadStatus = async () => {
      try {
        // Use user.status if available, otherwise default to 'online'
        if (user.status) {
          setStatus(user.status)
        } else {
          // If user doesn't have status, set default and save to backend
          setStatus('online')
          await userAPI.updateStatus('online')
        }
      } catch (error) {
        console.error('Failed to load user status:', error)
        // Fallback to localStorage if backend fails
        const stored = localStorage.getItem('userStatus')
        if (stored) {
          setStatus(stored)
        }
      } finally {
        setLoading(false)
      }
    }

    loadStatus()
  }, [user, isAuthenticated])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          setIsOpen(false)
        }
      })
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleStatusChange = async (newStatus) => {
    try {
      setStatus(newStatus)
      // Save to backend
      await userAPI.updateStatus(newStatus)
      // Also save to localStorage as fallback
      localStorage.setItem('userStatus', newStatus)
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to update status:', error)
      // Revert on error
      const stored = localStorage.getItem('userStatus')
      if (stored) {
        setStatus(stored)
      }
    }
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const currentStatus = STATUS_OPTIONS.find((opt) => opt.value === status) || STATUS_OPTIONS[0]

  return (
    <div className="user-status-dropdown-container" ref={dropdownRef}>
      <button
        className="user-status-dropdown-button"
        data-status={status}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User status"
      >
        <span
          className="user-status-badge"
          style={{ color: currentStatus.color }}
        >
          {currentStatus.icon}
        </span>
        <span className="user-status-label">{currentStatus.label}</span>
      </button>

      {isOpen && (
        <div className="user-status-dropdown-menu">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`user-status-option ${status === option.value ? 'active' : ''}`}
              data-status={option.value}
              onClick={() => handleStatusChange(option.value)}
            >
              <span
                className="user-status-option-badge"
                style={{ color: option.color }}
              >
                {option.icon}
              </span>
              <span className="user-status-option-label">{option.label}</span>
              {status === option.value && (
                <span className="user-status-option-check">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default UserStatusDropdown
