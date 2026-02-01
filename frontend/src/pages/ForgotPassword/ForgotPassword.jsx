import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authAPI } from '../../services/api'
import '../Login/Login.css'
import './ForgotPassword.css'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) {
      setMessage('Please enter your email.')
      setStatus('error')
      return
    }
    setStatus('loading')
    setMessage('')
    try {
      const data = await authAPI.forgotPassword(trimmed)
      setStatus('success')
      setMessage(data.message || 'If that email is registered, we sent a reset link. Check your inbox and spam folder.')
    } catch (err) {
      setStatus('error')
      setMessage(err.response?.data?.message || err.message || 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="login-container">
      <div className="login-brand">
        <Link to="/" className="login-brand-link">
          <img
            src="assets/logos/chapadevs-logo.png"
            alt="Chapadevs"
            className="login-brand-logo"
          />
        </Link>
        <p className="login-brand-tagline">Build with us</p>
      </div>
      <div className="login-form-panel">
        <div className="login-card">
          <div className="login-header">
            <h1>Forgot password</h1>
            <p>Enter your email and we&apos;ll send you a reset link</p>
          </div>

          {status === 'success' && (
            <div className="login-info-message">
              {message}
              <p className="forgot-back-link">
                <Link to="/login">Back to sign in</Link>
              </p>
            </div>
          )}

          {status !== 'success' && (
            <form onSubmit={handleSubmit} className="login-form">
              {status === 'error' && message && (
                <div className="error-message">{message}</div>
              )}
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={status === 'loading'}
                />
              </div>
              <button
                type="submit"
                className="login-button"
                disabled={status === 'loading'}
              >
                {status === 'loading' ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          )}

          {status !== 'success' && (
            <div className="login-footer">
              <p>
                Remember your password? <Link to="/login">Sign in</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
