import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './Login.css'

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [localError, setLocalError] = useState('')

  const { login, user, loading, error: authError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const fromRegister = location.state?.fromRegister
  const registeredEmail = location.state?.email
  const passwordReset = location.state?.passwordReset

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard')
    }
  }, [user, navigate])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setLocalError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')

    if (!formData.email || !formData.password) {
      setLocalError('Please fill in all fields')
      return
    }

    const result = await login(formData.email, formData.password)

    if (result.success) {
      navigate('/dashboard')
    } else {
      setLocalError(result.error || 'Login failed')
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
            <h1>Welcome Back</h1>
            <p>Sign in to your account</p>
          </div>

          {fromRegister && (
            <div className="login-info-message">
              We sent a verification link to {registeredEmail || 'your email'}. Check your inbox and spam folder, then sign in after verifying.
            </div>
          )}

          {passwordReset && (
            <div className="login-info-message">
              Password reset. You can sign in with your new password.
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
          {(localError || authError) && (
            <div className="login-error-wrap">
              <div className="error-message">
                {localError || authError}
              </div>
              {(localError || authError || '').toLowerCase().includes('verify your email') && (
                <p className="login-verify-hint">
                  Check your inbox and spam folder for the email from Chapadevs, click the verification link, then try signing in again.
                </p>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <p className="login-forgot-link">
            <Link to="/forgot-password">Forgot password?</Link>
          </p>
        </form>

          <div className="login-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/register">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login;

