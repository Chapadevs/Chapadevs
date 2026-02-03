import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Header from '../../components/Header/Header'
import NotificationBadge from '../../components/NotificationBadge/NotificationBadge'
import './Profile.css'

const Profile = () => {
  const { user, updateProfile, loading, error: authError } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    avatar: '',
    skills: '',
    bio: '',
    industry: '',
  })
  const [localError, setLocalError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Populate form with user data
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        company: user.company || '',
        phone: user.phone || '',
        avatar: user.avatar || '',
        skills: Array.isArray(user.skills) ? user.skills.join(', ') : user.skills || '',
        bio: user.bio || '',
        industry: user.industry || '',
      })
    }
  }, [user])

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
    if (!formData.name || !formData.email) {
      setLocalError('Name and email are required')
      return
    }

    // Convert skills string to array
    const userData = {
      ...formData,
      skills: formData.skills ? formData.skills.split(',').map(s => s.trim()).filter(s => s) : [],
    }

    const result = await updateProfile(userData)

    if (result.success) {
      setSuccessMessage('Profile updated successfully!')
    } else {
      setLocalError(result.error || 'Profile update failed')
    }
  }

  return (
    <>
      <Header />
      <div className="profile-container">
        <div className="profile-card">
          <Link to="/dashboard" className="profile-back">
            ← Go back
          </Link>
          <div className="profile-header">
            <h1>Profile Settings<NotificationBadge /></h1>
            <p>Update your account information</p>
          </div>

          <form onSubmit={handleSubmit} className="profile-form">
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

            <div className="profile-form-grid">
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
                <label htmlFor="company">Company</label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Your Company Name"
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
                  placeholder="+1 (555) 123-4567"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="avatar">Avatar URL</label>
                <input
                  type="url"
                  id="avatar"
                  name="avatar"
                  value={formData.avatar}
                  onChange={handleChange}
                  placeholder="https://example.com/avatar.jpg"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="industry">Industry</label>
                <input
                  type="text"
                  id="industry"
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  placeholder="e.g., Technology, Healthcare, Finance"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="skills">Skills (comma-separated)</label>
                <input
                  type="text"
                  id="skills"
                  name="skills"
                  value={formData.skills}
                  onChange={handleChange}
                  placeholder="React, Node.js, Python"
                  disabled={loading}
                />
              </div>

              <div className="form-group form-group-full">
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Tell us about yourself..."
                  rows="3"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              className="profile-button"
              disabled={loading}
            >
              {loading ? 'Updating Profile...' : 'Update Profile'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

export default Profile



