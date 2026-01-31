import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { userAPI } from '../../services/api'
import './UserStatus.css'

const UserStatus = () => {
  const { user } = useAuth()
  const [status, setStatus] = useState(user?.status || 'Available')
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user?.status) {
      setStatus(user.status)
    }
  }, [user])

  const handleStatusChange = async (newStatus) => {
    try {
      setUpdating(true)
      setError(null)
      await userAPI.updateStatus(newStatus)
      // Update local state
      setStatus(newStatus)
      // Update localStorage to persist the change
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
      localStorage.setItem('user', JSON.stringify({ ...storedUser, status: newStatus }))
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const getStatusClass = (statusValue) => {
    const statusMap = {
      'Available': 'status-available',
      'Busy': 'status-busy',
      'Unavailable': 'status-unavailable',
    }
    return statusMap[statusValue] || ''
  }

  // Only show for programmers (availability is for developers to signal when they can take work)
  if (user?.role !== 'programmer') {
    return null
  }

  return (
    <div className="user-status-container">
      <h3>My Availability</h3>
      {error && <div className="error-message">{error}</div>}
      <div className="status-selector">
        {['Available', 'Busy', 'Unavailable'].map((statusOption) => (
          <button
            key={statusOption}
            onClick={() => handleStatusChange(statusOption)}
            className={`status-button ${getStatusClass(statusOption)} ${
              status === statusOption ? 'active' : ''
            }`}
            disabled={updating || status === statusOption}
          >
            {statusOption}
          </button>
        ))}
      </div>
      {updating && <p className="updating-indicator">Updating...</p>}
    </div>
  )
}

export default UserStatus

