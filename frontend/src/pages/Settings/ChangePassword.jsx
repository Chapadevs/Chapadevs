import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Header from '../../components/Header/Header'
import './ChangePassword.css'

const ChangePassword = () => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [localError, setLocalError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const { changePassword, loading, error: authError } = useAuth()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setLocalError('')
    setSuccessMessage('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    setSuccessMessage('')

    // Validation
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setLocalError('Please fill in all fields')
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setLocalError('New passwords do not match')
      return
    }

    if (formData.newPassword.length < 6) {
      setLocalError('New password must be at least 6 characters')
      return
    }

    if (formData.currentPassword === formData.newPassword) {
      setLocalError('New password must be different from current password')
      return
    }

    const result = await changePassword(formData.currentPassword, formData.newPassword)

    if (result.success) {
      setSuccessMessage('Password changed successfully!')
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } else {
      setLocalError(result.error || 'Password change failed')
    }
  }

  return (
    <>
      <Header />
      <div className="change-password-container">
        <div className="change-password-card">
          <Link to="/dashboard" className="change-password-back">
            ← Go back
          </Link>
          <div className="change-password-header">
            <h1>Change Password</h1>
            <p>Update your account password</p>
          </div>

          <form onSubmit={handleSubmit} className="change-password-form">
            {(localError || authError) && (
              <div className="error-message">
                {localError || authError}
              </div>
            )}

            {successMessage && (
              <div className="success-message">
                {successMessage}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="currentPassword">Current Password *</label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="Enter your current password"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">New Password *</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="At least 6 characters"
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password *</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your new password"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="change-password-button"
              disabled={loading}
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

export default ChangePassword



