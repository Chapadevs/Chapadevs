import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { Button, Card, Alert, Input, Select } from '../../../components/ui-components'
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
        <Card variant="outline" className="register-card">
          <div className="register-header">
            <h1>Create Account</h1>
            <p>Sign up to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="register-form">
            {(localError || authError) && (
              <Alert variant="error">
                {localError || authError}
              </Alert>
            )}

            <div className="register-form-grid">
              <Input type="text" id="name" label="Full Name" required name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" disabled={loading} wrapperClassName="form-group" />
              <Input type="email" id="email" label="Email" required name="email" value={formData.email} onChange={handleChange} placeholder="your@email.com" disabled={loading} wrapperClassName="form-group" />
              <Input type="tel" id="phone" label="Phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone" disabled={loading} wrapperClassName="form-group" />
              <Input type="text" id="company" label="Company" name="company" value={formData.company} onChange={handleChange} placeholder="Company" disabled={loading} wrapperClassName="form-group" />
              <Select id="role" label="I am a" required name="role" value={formData.role} onChange={handleChange} disabled={loading} wrapperClassName="form-group">
                <option value="client">Client</option>
                <option value="programmer">Programmer</option>
              </Select>
              <div className="form-group form-group-spacer" />
              <Input type="password" id="password" label="Password" required name="password" value={formData.password} onChange={handleChange} placeholder="6+ characters" disabled={loading} minLength={6} wrapperClassName="form-group" />
              <Input type="password" id="confirmPassword" label="Confirm" required name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm password" disabled={loading} wrapperClassName="form-group" />
            </div>

            <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full register-button"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
          </form>

          <div className="register-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login">Sign in</Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default Register

