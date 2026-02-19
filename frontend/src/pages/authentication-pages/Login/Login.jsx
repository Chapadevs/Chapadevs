import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { Button, Card, Alert, Input } from '../../../components/ui-components'
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
      navigate('/')
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
      navigate('/')
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
        <Card variant="outline" className="login-card">
          <div className="login-header">
            <h1>Welcome Back</h1>
            <p>Sign in to your account</p>
          </div>

          {fromRegister && (
            <Alert variant="info" className="login-info-message">
              We sent a verification link to {registeredEmail || 'your email'}. Check your inbox and spam folder, then sign in after verifying.
            </Alert>
          )}

          {passwordReset && (
            <Alert variant="info" className="login-info-message">
              Password reset. You can sign in with your new password.
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="login-form">
          {(localError || authError) && (
            <div className="login-error-wrap">
              <Alert variant="error">
                {localError || authError}
              </Alert>
              {(localError || authError || '').toLowerCase().includes('verify your email') && (
                <p className="login-verify-hint">
                  Check your inbox and spam folder for the email from Chapadevs, click the verification link, then try signing in again.
                </p>
              )}
            </div>
          )}

          <Input type="email" id="email" label="Email" name="email" value={formData.email} onChange={handleChange} placeholder="your@email.com" required disabled={loading} wrapperClassName="form-group" />

          <Input type="password" id="password" label="Password" name="password" value={formData.password} onChange={handleChange} placeholder="Enter your password" required disabled={loading} wrapperClassName="form-group" />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full login-button"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
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
        </Card>
      </div>
    </div>
  )
}

export default Login;

