import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import Header from '../../../components/layout-components/Header/Header'
import { Button, Card, Alert, PageTitle, Input } from '../../../components/ui-components'
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
        <Card variant="outline" className="change-password-card">
          <Link to="/dashboard" className="change-password-back">
            ← Go back
          </Link>
          <div className="change-password-header">
            <h1>Change Password</h1>
            <p>Update your account password</p>
          </div>

          <form onSubmit={handleSubmit} className="change-password-form">
            {(localError || authError) && (
              <Alert variant="error">
                {localError || authError}
              </Alert>
            )}

            {successMessage && (
              <Alert variant="success">
                {successMessage}
              </Alert>
            )}

            <Input type="password" id="currentPassword" label="Current Password" required name="currentPassword" value={formData.currentPassword} onChange={handleChange} placeholder="Enter your current password" disabled={loading} wrapperClassName="form-group" />

            <Input type="password" id="newPassword" label="New Password" required name="newPassword" value={formData.newPassword} onChange={handleChange} placeholder="At least 6 characters" disabled={loading} minLength={6} wrapperClassName="form-group" />

            <Input type="password" id="confirmPassword" label="Confirm New Password" required name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm your new password" disabled={loading} wrapperClassName="form-group" />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full change-password-button"
              disabled={loading}
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </Button>
          </form>
        </Card>
      </div>
    </>
  )
}

export default ChangePassword



