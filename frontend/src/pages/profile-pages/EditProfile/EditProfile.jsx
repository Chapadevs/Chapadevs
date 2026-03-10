import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { useRole } from '../../../hooks/useRole'
import Header from '../../../components/layout-components/Header/Header'
import {
  Button,
  Card,
  Alert,
  SectionTitle,
  Input,
  Textarea,
  Avatar,
  AvatarImage,
  AvatarFallback,
  NotificationBadge,
} from '../../../components/ui-components'
import { getAvatarUrl } from '../../../utils/avatarUtils'
import { Camera, Pencil, Trash2 } from 'lucide-react'
import './EditProfile.css'

const EditProfile = () => {
  const navigate = useNavigate()
  const { user, updateProfile, changePassword, deleteProfile, logout, loading, error: authError } = useAuth()
  const { isClient, isProgrammer } = useRole()

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
  const fileInputRef = useRef(null)

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
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
      reader.readAsDataURL(compressedFile)
    } catch (err) {
      setProfileError('Failed to process image. Please try again.')
      console.error('Image compression error:', err)
      if (fileInputRef.current) fileInputRef.current.value = ''
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

      // Update avatar preview with the returned avatar from server; keep current preview if server didn't return one
      if (result.avatar != null) {
        const avatarUrl = getAvatarUrl(result.avatar)
        setAvatarPreview(avatarUrl)
        setFormData((prev) => ({ ...prev, avatar: result.avatar }))
      }
      // If no avatar in response but we had one selected, keep the base64 preview (avatar upload may have failed silently)
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
        <Card variant="outline" className="profile-card p-8">
          <button type="button" onClick={() => navigate(-1)} className="profile-back bg-transparent border-none cursor-pointer p-0 text-left font-body text-primary hover:underline">
            ← Go back
          </button>
          <div className="profile-header-with-avatar">
            <div className="profile-avatar-container">
              <div
                role="button"
                tabIndex={0}
                onClick={() => !loading && fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                className="profile-avatar-label cursor-pointer group"
                aria-label="Upload profile picture"
              >
                <div className="relative w-24 h-24 shrink-0">
                  {/* The Upload Overlay - behind avatar when image exists, on top when no image */}
                  <div
                    className={`profile-avatar-overlay absolute inset-0 rounded-full overflow-hidden bg-gray-600/30 flex items-center justify-center transition-opacity duration-500 ease-in-out ${avatarPreview ? 'opacity-0 group-hover:opacity-100 z-20' : 'opacity-100 group-hover:opacity-0 z-10'}`}
                  >
                    <Camera className="w-8 h-8 text-white" aria-hidden />
                  </div>

                  {/* Avatar - on top when image exists so uploaded image replaces the placeholder */}
                  <Avatar className={`absolute inset-0 w-full h-full border-2 border-primary/20 ${avatarPreview ? 'z-10' : 'z-0'}`}>
                    <AvatarImage 
                      key={avatarPreview || 'fallback'}
                      src={avatarPreview} 
                      alt={user?.name} 
                    />
                    <AvatarFallback className="text-2xl bg-surface-gray">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="profile-avatar-input"
                  style={{ display: 'none' }}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="profile-header">
              <h1>Profile Overview<NotificationBadge /></h1>
              {editingBio ? (
                <div className="profile-bio-edit">
                  <Textarea
                    value={bioValue}
                    onChange={(e) => setBioValue(e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows={3}
                    className="profile-bio-textarea"
                    autoFocus
                  />
                  <div className="profile-bio-edit-actions">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className="profile-bio-save"
                      onClick={handleSaveBio}
                      disabled={loading}
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="profile-bio-cancel"
                      onClick={() => {
                        setBioValue(user?.bio || '')
                        setEditingBio(false)
                      }}
                    >
                      Cancel
                    </Button>
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
                    className="profile-bio-edit-icon p-0.5 text-gray-500 hover:text-gray-700"
                    onClick={() => setEditingBio(true)}
                    title="Edit bio"
                  >
                    <Pencil className="w-3 h-3" aria-hidden />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="profile-form">
            {/* Profile Information Form */}
            <form id="profile-form" onSubmit={handleProfileSubmit}>
              {(profileError || (authError && !passwordError)) && (
                <Alert variant="error">
                  {profileError || authError}
                </Alert>
              )}

              {profileSuccess && (
                <Alert variant="success">
                  {profileSuccess}
                </Alert>
              )}

              {/* Profile fields: Basic + role-specific in one section */}
              <div className="form-section form-section--unified">
                <SectionTitle className="mb-4">Profile Information</SectionTitle>
                <div className="profile-form-grid">
                  <Input type="text" id="name" label="Full Name" required name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" disabled={loading} wrapperClassName="form-group" />

                  <Input type="email" id="email" label="Email" required name="email" value={formData.email} onChange={handleChange} placeholder="your@email.com" disabled={loading} wrapperClassName="form-group" />

                  {isClient && (
                    <>
                      <Input type="text" id="company" label="Company" name="company" value={formData.company} onChange={handleChange} placeholder="Your Company Name" disabled={loading} wrapperClassName="form-group" />
                      <Input type="tel" id="phone" label="Phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 (555) 123-4567" disabled={loading} wrapperClassName="form-group" />
                      <Input type="text" id="industry" label="Industry" name="industry" value={formData.industry} onChange={handleChange} placeholder="e.g., Technology, Healthcare, Finance" disabled={loading} wrapperClassName="form-group" />
                    </>
                  )}

                  {isProgrammer && (
                    <>
                      <Input type="text" id="skills" label="Skills (comma-separated)" name="skills" value={formData.skills} onChange={handleChange} placeholder="React, Node.js, Python" disabled={loading} wrapperClassName="form-group" />
                      <Input type="number" id="hourlyRate" label="Hourly Rate" name="hourlyRate" value={formData.hourlyRate} onChange={handleChange} placeholder="e.g., 50" min="0" step="0.01" disabled={loading} wrapperClassName="form-group" />
                    </>
                  )}
                </div>
              </div>
            </form>

            {/* Section 4: Security - Password Change */}
            <form onSubmit={handlePasswordSubmit} className="password-form-section">
              <div className="form-section">
                <SectionTitle className="mb-4">Security</SectionTitle>
                <p className="form-section-description">
                  To change your password, we'll send a confirmation email to your registered email address.
                </p>
                {passwordError && (
                  <Alert variant="error">
                    {passwordError}
                  </Alert>
                )}

                {passwordSuccess && (
                  <Alert variant="success">
                    {passwordSuccess}
                  </Alert>
                )}

                <div className="profile-form-grid">
                  <Input type="password" id="currentPassword" label="Current Password" required name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} placeholder="Enter your current password" disabled={loading} wrapperClassName="form-group" />
                </div>

                <div className="profile-form-actions">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? 'Sending confirmation email...' : 'Request Password Change'}
                  </Button>
                </div>
              </div>
            </form>

            {/* Delete Account Section */}
            <div className="form-section form-section--danger">
              <SectionTitle className="mb-4">Danger Zone</SectionTitle>
              <p className="form-section-description">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              {deleteError && (
                <Alert variant="error" className="form-section-error">
                  {deleteError}
                </Alert>
              )}
              <Button
                type="button"
                variant="danger"
                size="lg"
                onClick={handleDeleteProfile}
                disabled={deleting || loading}
                className="gap-2"
              >
                <Trash2 className="size-4 shrink-0" aria-hidden />
                {deleting ? 'Deleting Account...' : 'Delete My Account'}
              </Button>
            </div>

            {/* Update Profile Button - Moved to bottom */}
            <div className="profile-form-actions">
              <Button
                type="submit"
                form="profile-form"
                variant="primary"
                size="lg"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}

export default EditProfile



