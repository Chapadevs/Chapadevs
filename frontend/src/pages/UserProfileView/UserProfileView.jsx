import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { userAPI } from '../../services/api'
import { isClient, isProgrammer } from '../../utils/roles'
import Header from '../../components/layout-components/Header/Header'
import { Card, SectionTitle, Tag, Alert } from '../../components/ui-components'
import './UserProfileView.css'

const UserProfileView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [profileUser, setProfileUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isOwnProfile =
    currentUser?._id === id ||
    currentUser?.id === id ||
    (currentUser && id && currentUser._id?.toString() === id.toString())

  useEffect(() => {
    if (isOwnProfile) {
      navigate('/profile')
      return
    }

    const fetchProfile = async () => {
      try {
        setLoading(true)
        setError('')
        const data = await userAPI.getUserProfile(id)
        setProfileUser(data)
      } catch (err) {
        setError(
          err.response?.data?.message ||
            err.message ||
            'Failed to load profile'
        )
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchProfile()
    }
  }, [id, isOwnProfile, navigate])

  const getAvatarUrl = (avatar) => {
    if (!avatar) return null
    if (avatar.startsWith('data:image/')) return avatar
    if (avatar.startsWith('/uploads/')) {
      const backendUrl =
        import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api'
      const baseUrl = backendUrl.replace('/api', '').replace(/\/$/, '')
      return `${baseUrl}${avatar}`
    }
    return avatar
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="profile-view-container">
          <Card variant="outline" className="profile-card p-8">
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              Loading...
            </div>
          </Card>
        </div>
      </>
    )
  }

  if (error || !profileUser) {
    return (
      <>
        <Header />
        <div className="profile-view-container">
          <Card variant="outline" className="profile-card p-8">
            <Alert variant="error">
              {error || 'User not found'}
            </Alert>
            <Link to="/dashboard" className="profile-back">
              ← Go back
            </Link>
          </Card>
        </div>
      </>
    )
  }

  const profileIsProgrammer = isProgrammer(profileUser)
  const profileIsClient = isClient(profileUser)
  const avatarUrl = getAvatarUrl(profileUser.avatar)

  return (
    <>
      <Header />
      <div className="profile-view-container">
        <Card variant="outline" className="profile-card p-8">
          <Link to="/dashboard" className="profile-back">
            ← Go back
          </Link>

          <div className="profile-header-with-avatar">
            <div className="profile-avatar-container">
              <div className="profile-avatar-preview">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={profileUser.name}
                    className="profile-avatar-image"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.nextElementSibling.style.display = 'flex'
                    }}
                  />
                ) : null}
                <div
                  className="profile-avatar-placeholder"
                  style={{ display: avatarUrl ? 'none' : 'flex' }}
                >
                  {profileUser.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              </div>
            </div>
            <div className="profile-header">
              <h1>{profileUser.name}</h1>
              <p>
                {profileIsProgrammer
                  ? 'Programmer'
                  : profileIsClient
                    ? 'Client'
                    : profileUser.role}
              </p>
              {profileUser.bio && (
                <p className="profile-header-bio">{profileUser.bio}</p>
              )}
            </div>
          </div>

          <div className="profile-view-content">
            {/* Basic Information */}
            <div className="form-section">
              <SectionTitle className="mb-4">Contact Information</SectionTitle>
              <div className="profile-form-grid">
                <div className="form-group">
                  <label>Email</label>
                  <div className="profile-view-value">
                    <a href={`mailto:${profileUser.email}`}>
                      {profileUser.email}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Client Information */}
            {profileIsClient && (profileUser.company || profileUser.phone || profileUser.industry) && (
              <div className="form-section">
                <SectionTitle className="mb-4">Client Information</SectionTitle>
                <div className="profile-form-grid">
                  {profileUser.company && (
                    <div className="form-group">
                      <label>Company</label>
                      <div className="profile-view-value">
                        {profileUser.company}
                      </div>
                    </div>
                  )}
                  {profileUser.phone && (
                    <div className="form-group">
                      <label>Phone</label>
                      <div className="profile-view-value">
                        {profileUser.phone}
                      </div>
                    </div>
                  )}
                  {profileUser.industry && (
                    <div className="form-group">
                      <label>Industry</label>
                      <div className="profile-view-value">
                        {profileUser.industry}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Programmer Information */}
            {profileIsProgrammer && (
              <div className="form-section">
                <SectionTitle className="mb-4">Programmer Information</SectionTitle>
                <div className="profile-form-grid">
                  <div className="form-group form-group-full">
                    <label>Skills</label>
                    <div className="profile-view-value">
                      {profileUser.skills && profileUser.skills.length > 0 ? (
                        <div className="profile-skills-list">
                          {profileUser.skills.map((skill, index) => (
                            <Tag key={index} variant="skill" className="profile-skill-tag">
                              {skill}
                            </Tag>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          No skills listed
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Hourly Rate</label>
                    <div className="profile-view-value">
                      {profileUser.hourlyRate ? (
                        `$${profileUser.hourlyRate}/hr`
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          Not specified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  )
}

export default UserProfileView
