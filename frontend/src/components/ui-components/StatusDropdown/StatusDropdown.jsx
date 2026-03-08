import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, User, FolderKanban } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { userAPI } from '../../../services/api'
import { NavDropdown, Badge } from '..'

const STATUS_OPTIONS = [
  { value: 'online', color: '#4caf50' },
  { value: 'away', color: '#facc15' },
  { value: 'busy', color: '#f44336' },
  { value: 'offline', color: '#9e9e9e' },
]

const StatusDropdown = ({ trigger }) => {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState(user?.status || 'online')

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

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
    <NavDropdown trigger={trigger} align="auto">
      <div className="flex flex-col">
        <div className="px-2 py-0.5 border-b border-white/10">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold truncate">{user.name}</span>
            <Badge variant={user.role} className="text-[7px] px-1 py-0 h-fit leading-none">
              {user.role}
            </Badge>
          </div>
          <p className="text-[9px] truncate text-gray-600 mt-0.5">{user.email}</p>
        </div>

        <Link to="/profile" className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] hover:bg-white/10 transition-colors">
          <User className="size-3 shrink-0" />
          Edit profile
        </Link>
        <Link to="/projects" className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] hover:bg-white/10 transition-colors">
          <FolderKanban className="size-3 shrink-0" />
          Projects
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] w-full text-left border-0 bg-transparent cursor-pointer hover:bg-white/10 transition-colors"
        >
          <LogOut className="size-3 shrink-0" />
          Leave
        </button>

        <div className="flex items-center justify-start gap-2 border-t border-white/10 mt-1.5 pt-1.5 pl-2 pr-1 pb-1">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`p-1 transition-all ${status === option.value ? 'ring-1 ring-white/30 scale-110' : 'hover:opacity-80'}`}
              onClick={() => handleStatusChange(option.value)}
              title={option.value}
              aria-label={`Set status to ${option.value}`}
            >
              <span
                className="block size-2 rounded-full"
                style={{ backgroundColor: option.color }}
              />
            </button>
          ))}
        </div>
      </div>
    </NavDropdown>
  )
}


export default StatusDropdown