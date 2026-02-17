import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { userAPI } from '../../../services/api'
import { NavDropdown, Badge } from '..' 
import './StatusDropdown.css'

const STATUS_OPTIONS = [
  { value: 'online', label: 'Online', color: '#4caf50', icon: '●' },
  { value: 'away', label: 'Away', color: '#facc15', icon: '●' },
  { value: 'busy', label: 'Busy', color: '#f44336', icon: '●' },
  { value: 'offline', label: 'Offline', color: '#9e9e9e', icon: '○' },
]

const StatusDropdown = ({trigger}) => {
  const { user, isAuthenticated } = useAuth()
  const [status, setStatus] = useState(user?.status || 'online')

  useEffect(() => {
    if (user?.status) setStatus(user.status)
  }, [user])


  const handleStatusChange = async (newStatus) => {
    try {
      setStatus(newStatus)
      await userAPI.updateStatus(newStatus)
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  if (!isAuthenticated || !user) return null


  return (
    <NavDropdown trigger={trigger} align="right">
      <div className="user-status-dropdown-menu-content">
        <div className="px-4 py-2 border-b border-white/10">
           <div className="flex items-center gap-2 mb-1">
             <span className="text-xs font-bold truncate">{user.name}</span>
             <Badge variant={user.role} className="text-[8px] px-1 py-0 h-fit leading-none">
                {user.role}
             </Badge>
           </div>
           <p className="text-[10px] truncate">{user.email}</p>
        </div>

        <Link to="/profile" className="resources-dropdown-link">Edit profile</Link>
        <Link to="/dashboard" className="resources-dropdown-link">Dashboard</Link>
        
        <div className="resources-dropdown-group border-t border-white/10 mt-2 pt-2">
          <span className="resources-dropdown-label">Availability</span>
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`user-status-option ${status === option.value ? 'active' : ''}`}
              onClick={() => handleStatusChange(option.value)}
            >
              <span style={{ color: option.color }}>{option.icon}</span>
              <span className="ml-2">{option.label}</span>
              {status === option.value && <span className="ml-auto">✓</span>}
            </button>
          ))}
        </div>
      </div>
    </NavDropdown>
  )
}


export default StatusDropdown