import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { userAPI } from '../../services/api'
import './UserStatusDropdown.css'

const STATUS_OPTIONS = [
  { value: 'online', label: 'Online', color: '#4caf50', icon: '●' },
  { value: 'away', label: 'Away', color: '#facc15', icon: '●' },
  { value: 'busy', label: 'Busy', color: '#f44336', icon: '●' },
  { value: 'offline', label: 'Offline', color: '#9e9e9e', icon: '○' },
]

const getAvatarUrl = (avatar) => {
  if (!avatar) return null
  if (avatar.startsWith('data:image/')) return avatar
  if (avatar.startsWith('/uploads/')) {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api'
    const baseUrl = backendUrl.replace('/api', '').replace(/\/$/, '')
    return `${baseUrl}${avatar}`
  }
  return avatar
}

const ProfileIcon = ({ user }) => {
  const avatarUrl = user?.avatar ? getAvatarUrl(user.avatar) : null
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="user-status-profile-avatar"
        aria-hidden="true"
      />
    )
  }
  return (
    <svg
      className="user-status-profile-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  )
}

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

    const loadStatus = async () => {
      try {
        if (user.status) {
          setStatus(user.status)
        } else {
          setStatus('online')
          await userAPI.updateStatus('online')
        }
      } catch (error) {
        console.error('Failed to load user status:', error)
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
      await userAPI.updateStatus(newStatus)
      localStorage.setItem('userStatus', newStatus)
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to update status:', error)
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
        className="user-status-dropdown-button user-status-dropdown-button--icon"
        data-status={status}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Profile and availability"
      >
        <span className="user-status-profile-wrapper">
          <ProfileIcon user={user} />
          <span
            className="user-status-indicator"
            style={{ backgroundColor: currentStatus.color }}
            title={currentStatus.label}
            aria-hidden="true"
          />
        </span>
      </button>

      {isOpen && (
        <div className="user-status-dropdown-menu">
          <Link
            to="/profile"
            className="user-status-dropdown-item user-status-dropdown-item--edit"
            onClick={() => setIsOpen(false)}
          >
            Edit profile
          </Link>
          <Link
            to="/dashboard"
            className="user-status-dropdown-item"
            onClick={() => setIsOpen(false)}
          >
            Dashboard
          </Link>
          <div className="user-status-availability-section">
            <span className="user-status-availability-label">Availability</span>
            <div className="user-status-availability-options">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
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
          </div>
        </div>
      )}
    </div>
  )
}

export default UserStatusDropdown
