import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import './Register.css'

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'client',
    company: '',
    phone: '',
  })
  const [localError, setLocalError] = useState('')

  const { register, user, loading, error: authError } = useAuth()
  const navigate = useNavigate()

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

    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      setLocalError('Please fill in all required fields')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setLocalError('Password must be at least 6 characters')
      return
    }

    const result = await register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      company: formData.company || undefined,
      phone: formData.phone || undefined,
    })

    if (result.success) {
      navigate('/login', { state: { fromRegister: true, email: result.email } })
    } else {
      setLocalError(result.error || 'Registration failed')
    }
  }

  return (
    <div className="register-container">
      <div className="register-brand">
        <Link to="/" className="register-brand-link">
          <img
            src="assets/logos/chapadevs-logo.png"
            alt="Chapadevs"
            className="register-brand-logo"
          />
        </Link>
        <p className="register-brand-tagline">Build with us</p>
      </div>
      <div className="register-form-panel">
        <div className="register-card">
          <div className="register-header">
            <h1>Create Account</h1>
            <p>Sign up to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="register-form">
            {(localError || authError) && (
              <div className="register-form-error">
                {localError || authError}
              </div>
            )}

            <div className="register-form-grid">
              <div className="form-group">
                <label htmlFor="name">Full Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email *</label>
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
                <label htmlFor="phone">Phone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Phone"
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="company">Company</label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Company"
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="role">I am a *</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  disabled={loading}
                >
                  <option value="client">Client</option>
                  <option value="programmer">Programmer</option>
                </select>
              </div>
              <div className="form-group form-group-spacer" />
              <div className="form-group">
                <label htmlFor="password">Password *</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="6+ characters"
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm *</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
            type="submit"
            className="register-button"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
          </form>

          <div className="register-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register

