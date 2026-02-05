import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Header from '../../components/Header/Header'
import NotificationBadge from '../../components/NotificationBadge/NotificationBadge'
import './Profile.css'

const Profile = () => {
  const { user, updateProfile, changePassword, deleteProfile, logout, loading, error: authError } = useAuth()
  const isProgrammer = user?.role === 'programmer'
  const isClient = user?.role === 'user' || user?.role === 'client'

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    avatar: '',
    skills: '',
    bio: '',
    industry: '',
    hourlyRate: '',
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
  })
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [editingBio, setEditingBio] = useState(false)
  const [bioValue, setBioValue] = useState('')

  // Helper function to get avatar URL
  const getAvatarUrl = (avatar) => {
    if (!avatar) return null
    // If it's a base64 data URL, return as is
    if (avatar.startsWith('data:image/')) {
      return avatar
    }
    // If it's a file path, construct the full URL
    if (avatar.startsWith('/uploads/')) {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api'
      const baseUrl = backendUrl.replace('/api', '').replace(/\/$/, '')
      return `${baseUrl}${avatar}`
    }
    // Return as is if it's already a full URL
    return avatar
  }

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
        hourlyRate: user.hourlyRate || '',
      })
      setBioValue(user.bio || '')
      // Set avatar preview if user has an avatar
      const avatarUrl = user.avatar ? getAvatarUrl(user.avatar) : null
      setAvatarPreview(avatarUrl)
    }
  }, [user])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setProfileError('')
    setProfileSuccess('')
  }

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    })
    setPasswordError('')
    setPasswordSuccess('')
  }

  const compressImage = (file, maxWidth = 400, maxHeight = 400, quality = 0.8) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width
              width = maxWidth
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height
              height = maxHeight
            }
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            (blob) => {
              resolve(blob)
            },
            'image/jpeg',
            quality
          )
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setProfileError('Please select an image file')
      return
    }

    // Validate file size (max 5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Image size must be less than 5MB')
      return
    }

    setProfileError('')

    try {
      // Compress the image
      const compressedBlob = await compressImage(file)
      const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' })
      
      setAvatarFile(compressedFile)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result)
      }
      reader.readAsDataURL(compressedFile)
    } catch (err) {
      setProfileError('Failed to process image. Please try again.')
      console.error('Image compression error:', err)
    }
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess('')

    // Validation
    if (!formData.name || !formData.email) {
      setProfileError('Name and email are required')
      return
    }

    // Convert skills string to array for programmers
    const userData = {
      ...formData,
    }

    // Handle avatar upload - convert to base64 if file is selected
    if (avatarFile) {
      try {
        const avatarBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(avatarFile)
        })
        userData.avatar = avatarBase64
      } catch (err) {
        setProfileError('Failed to process avatar image')
        return
      }
    } else if (formData.avatar) {
      // Preserve existing avatar if no new file is selected
      userData.avatar = formData.avatar
    }

    if (isProgrammer) {
      userData.skills = formData.skills ? formData.skills.split(',').map(s => s.trim()).filter(s => s) : []
      if (formData.hourlyRate) {
        userData.hourlyRate = parseFloat(formData.hourlyRate)
      }
    }

    const result = await updateProfile(userData)

    if (result.success) {
      setProfileSuccess('Profile updated successfully!')
      setAvatarFile(null)
      
      // Immediately update avatar preview with the returned avatar path from server
      if (result.avatar) {
        const avatarUrl = getAvatarUrl(result.avatar)
        setAvatarPreview(avatarUrl)
      } else {
        // If no avatar returned, clear preview
        setAvatarPreview(null)
      }
    } else {
      setProfileError(result.error || 'Profile update failed')
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    // Validation
    if (!passwordData.currentPassword) {
      setPasswordError('Please enter your current password')
      return
    }

    const result = await changePassword(passwordData.currentPassword)

    if (result.success) {
      setPasswordSuccess(result.message || 'Please check your email to confirm the password change. The confirmation link expires in 1 hour.')
      setPasswordData({
        currentPassword: '',
      })
    } else {
      setPasswordError(result.error || 'Password change request failed')
    }
  }

  const handleSaveBio = async () => {
    try {
      setProfileError('')
      setProfileSuccess('')
      
      const userData = {
        ...formData,
        bio: bioValue,
      }

      if (isProgrammer) {
        userData.skills = formData.skills ? formData.skills.split(',').map(s => s.trim()).filter(s => s) : []
        if (formData.hourlyRate) {
          userData.hourlyRate = parseFloat(formData.hourlyRate)
        }
      }

      const result = await updateProfile(userData)

      if (result.success) {
        setProfileSuccess('Bio updated successfully!')
        setEditingBio(false)
        // Update formData to reflect the change
        setFormData({
          ...formData,
          bio: bioValue,
        })
      } else {
        setProfileError(result.error || 'Bio update failed')
      }
    } catch (err) {
      setProfileError(err.message || 'Failed to update bio')
    }
  }

  const handleDeleteProfile = async () => {
    const confirmMessage = 'Are you sure you want to delete your account? This action cannot be undone. All your data, projects, and messages will be permanently deleted.\n\nType "DELETE" to confirm:'
    const userInput = window.prompt(confirmMessage)
    
    if (userInput !== 'DELETE') {
      return
    }

    const finalConfirm = window.confirm('This is your final warning. Deleting your account will permanently remove all your data. Are you absolutely sure?')
    if (!finalConfirm) {
      return
    }

    try {
      setDeleting(true)
      setDeleteError('')
      const result = await deleteProfile()
      
      if (result.success) {
        // Logout and redirect to home
        await logout()
        window.location.href = '/'
      } else {
        setDeleteError(result.error || 'Failed to delete account')
      }
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete account')
    } finally {
      setDeleting(false)
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
          <div className="profile-header-with-avatar">
            <div className="profile-avatar-container">
              <label htmlFor="avatar-upload" className="profile-avatar-label">
                <div className="profile-avatar-preview">
                  {avatarPreview ? (
                    <img 
                      src={avatarPreview} 
                      alt="Avatar" 
                      className="profile-avatar-image"
                      onError={(e) => {
                        // If image fails to load, show placeholder
                        console.error('Avatar image failed to load:', avatarPreview)
                        setAvatarPreview(null)
                        e.target.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="profile-avatar-placeholder">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="profile-avatar-overlay">
                    <span className="profile-avatar-icon">📷</span>
                  </div>
                </div>
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="profile-avatar-input"
                  disabled={loading}
                />
              </label>
            </div>
            <div className="profile-header">
              <h1>Profile Settings<NotificationBadge /></h1>
              {editingBio ? (
                <div className="profile-bio-edit">
                  <textarea
                    value={bioValue}
                    onChange={(e) => setBioValue(e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows="3"
                    className="profile-bio-textarea"
                    autoFocus
                  />
                  <div className="profile-bio-edit-actions">
                    <button
                      type="button"
                      className="profile-bio-save"
                      onClick={handleSaveBio}
                      disabled={loading}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="profile-bio-cancel"
                      onClick={() => {
                        setBioValue(user?.bio || '')
                        setEditingBio(false)
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="profile-bio-display">
                  {user?.bio ? (
                    <p className="profile-bio-text">{user.bio}</p>
                  ) : (
                    <p className="profile-bio-placeholder">Add a bio to tell others about yourself</p>
                  )}
                  <button
                    type="button"
                    className="profile-bio-edit-icon"
                    onClick={() => setEditingBio(true)}
                    title="Edit bio"
                  >
                    ✏️
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="profile-form">
            {/* Profile Information Form */}
            <form id="profile-form" onSubmit={handleProfileSubmit}>
              {(profileError || (authError && !passwordError)) && (
                <div className="error-message">
                  {profileError || authError}
                </div>
              )}

              {profileSuccess && (
                <div className="success-message">
                  {profileSuccess}
                </div>
              )}

              {/* Section 1: Basic Information */}
              <div className="form-section">
                <h3>Basic Information</h3>
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
                </div>
              </div>

              {/* Section 2: Client Information */}
              {isClient && (
                <div className="form-section">
                  <h3>Client Information</h3>
                  <div className="profile-form-grid">
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

                  </div>
                </div>
              )}

              {/* Section 3: Programmer Information */}
              {isProgrammer && (
                <div className="form-section">
                  <h3>Programmer Information</h3>
                  <div className="profile-form-grid">
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

                    <div className="form-group">
                      <label htmlFor="hourlyRate">Hourly Rate</label>
                      <input
                        type="number"
                        id="hourlyRate"
                        name="hourlyRate"
                        value={formData.hourlyRate}
                        onChange={handleChange}
                        placeholder="e.g., 50"
                        min="0"
                        step="0.01"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>
              )}
            </form>

            {/* Section 4: Security - Password Change */}
            <form onSubmit={handlePasswordSubmit} className="password-form-section">
              <div className="form-section">
                <h3>Security</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  To change your password, we'll send a confirmation email to your registered email address.
                </p>
                {passwordError && (
                  <div className="error-message">
                    {passwordError}
                  </div>
                )}

                {passwordSuccess && (
                  <div className="success-message">
                    {passwordSuccess}
                  </div>
                )}

                <div className="profile-form-grid">
                  <div className="form-group">
                    <label htmlFor="currentPassword">Current Password *</label>
                    <input
                      type="password"
                      id="currentPassword"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter your current password"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="profile-form-actions">
                  <button
                    type="submit"
                    className="profile-button"
                    disabled={loading}
                  >
                    {loading ? 'Sending confirmation email...' : 'Request Password Change'}
                  </button>
                </div>
              </div>
            </form>

            {/* Delete Account Section */}
            <div className="form-section" style={{ marginTop: '2rem', borderTop: '2px solid #fee2e2' }}>
              <h3 style={{ color: '#dc2626' }}>Danger Zone</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Once you delete your account, there is no going back. Please be certain.
              </p>
              {deleteError && (
                <div className="error-message" style={{ marginBottom: '1rem' }}>
                  {deleteError}
                </div>
              )}
              <button
                type="button"
                className="profile-button profile-button-danger"
                onClick={handleDeleteProfile}
                disabled={deleting || loading}
              >
                {deleting ? 'Deleting Account...' : 'Delete My Account'}
              </button>
            </div>

            {/* Update Profile Button - Moved to bottom */}
            <div className="profile-form-actions" style={{ marginTop: '1rem' }}>
              <button
                type="submit"
                form="profile-form"
                className="profile-button"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Profile



