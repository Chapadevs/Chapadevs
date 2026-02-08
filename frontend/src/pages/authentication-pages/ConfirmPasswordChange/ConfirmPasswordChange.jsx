import { useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../../../services/api'
import '../Login/Login.css'
import './ConfirmPasswordChange.css'

const ConfirmPasswordChange = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [message, setMessage] = useState('')

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setMessage('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token) {
      setMessage('Invalid or missing confirmation link.')
      setStatus('error')
      return
    }
    if (formData.newPassword.length < 6) {
      setMessage('Password must be at least 6 characters.')
      setStatus('error')
      return
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setMessage('Passwords do not match.')
      setStatus('error')
      return
    }
    setStatus('loading')
    setMessage('')
    try {
      const data = await authAPI.confirmPasswordChange(token, formData.newPassword)
      setStatus('success')
      setMessage(data.message || 'Password changed successfully. You can now log in with your new password.')
      setTimeout(() => navigate('/login', { state: { passwordChanged: true } }), 2500)
    } catch (err) {
      setStatus('error')
      setMessage(err.response?.data?.message || err.message || 'Password change failed. The link may have expired.')
    }
  }

  if (!token) {
    return (
      <div className="login-container">
        <div className="login-brand">
          <Link to="/" className="login-brand-link">
            <img src="assets/logos/chapadevs-logo.png" alt="Chapadevs" className="login-brand-logo" />
          </Link>
          <p className="login-brand-tagline">Build with us</p>
        </div>
        <div className="login-form-panel">
          <div className="login-card">
            <div className="login-header">
              <h1>Confirm password change</h1>
              <p className="error-message">Invalid or missing confirmation link. Request a new password change from your profile.</p>
            </div>
            <div className="login-footer">
              <p>
                <Link to="/profile">Go to profile</Link> or <Link to="/login">Sign in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-container">
      <div className="login-brand">
        <Link to="/" className="login-brand-link">
          <img src="assets/logos/chapadevs-logo.png" alt="Chapadevs" className="login-brand-logo" />
        </Link>
        <p className="login-brand-tagline">Build with us</p>
      </div>
      <div className="login-form-panel">
        <div className="login-card">
          <div className="login-header">
            <h1>Confirm password change</h1>
            <p>Enter your new password to complete the change</p>
          </div>

          {status === 'success' && (
            <div className="login-info-message">
              {message}
              <p>Redirecting to sign in...</p>
              <Link to="/login">Go to sign in now</Link>
            </div>
          )}

          {status !== 'success' && (
            <form onSubmit={handleSubmit} className="login-form">
              {status === 'error' && message && (
                <div className="error-message">{message}</div>
              )}
              <div className="form-group">
                <label htmlFor="newPassword">New password</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="6+ characters"
                  required
                  minLength={6}
                  disabled={status === 'loading'}
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                  disabled={status === 'loading'}
                />
              </div>
              <button
                type="submit"
                className="login-button"
                disabled={status === 'loading'}
              >
                {status === 'loading' ? 'Changing password...' : 'Confirm password change'}
              </button>
            </form>
          )}

          {status !== 'success' && (
            <div className="login-footer">
              <p>
                <Link to="/profile">Request a new change</Link> or <Link to="/login">Sign in</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ConfirmPasswordChange
