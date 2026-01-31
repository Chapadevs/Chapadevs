import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Link } from 'react-router-dom'
import Header from '../../components/Header/Header'
import UserStatus from '../../components/UserStatus/UserStatus'
import { getAIPreviewUsage, getAIPreviews } from '../../services/api'
import './Dashboard.css'

const Dashboard = () => {
  const { user } = useAuth()
  const [aiUsage, setAiUsage] = useState(null)
  const [previews, setPreviews] = useState([])
  const [previewsLoading, setPreviewsLoading] = useState(false)
  const isClient = user?.role === 'client' || user?.role === 'user'
  const showAiUsage = isClient

  useEffect(() => {
    if (!showAiUsage) return
    getAIPreviewUsage('month')
      .then((data) => setAiUsage(data))
      .catch(() => setAiUsage(null))
  }, [showAiUsage])

  useEffect(() => {
    if (!isClient) return
    setPreviewsLoading(true)
    getAIPreviews()
      .then((data) => setPreviews(data || []))
      .catch(() => setPreviews([]))
      .finally(() => setPreviewsLoading(false))
  }, [isClient])

  const renderRoleBlock = () => {
    switch (user?.role) {
      case 'admin':
        return {
          title: 'Projects',
          links: [
            { to: '/projects', label: 'View All Projects' },
            { to: '/assignments', label: 'Manage Assignments' },
          ],
        }
      case 'programmer':
        return {
          title: 'Projects',
          links: [
            { to: '/projects', label: 'My Assigned Projects' },
            { to: '/assignments', label: 'Available Projects' },
          ],
        }
      case 'client':
      case 'user':
      default:
        return {
          title: 'Projects',
          links: [
            { to: '/projects', label: 'My Projects' },
            { to: '/projects/create', label: 'Create New Project' },
          ],
        }
    }
  }

  const roleBlock = renderRoleBlock()
  const roleBadgeClass = user?.role === 'user' ? 'role-badge--client' : `role-badge--${user?.role}`

  return (
    <>
      <Header />
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="dashboard-header-left">
            <h1>Dashboard</h1>
            <div className="dashboard-user-info">
              <span className="dashboard-user-meta">
                {user?.email}
                <span className="dashboard-user-sep">·</span>
                <span className={`role-badge ${roleBadgeClass}`}>
                  {user?.role === 'user' ? 'CLIENT' : user?.role?.toUpperCase()}
                </span>
                {user?.company && (
                  <>
                    <span className="dashboard-user-sep">·</span>
                    <span>{user.company}</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="dashboard-content">
          <div className="dashboard-main-card">
            <div className="dashboard-main-grid">
              <section className="dashboard-main-block">
                <h3>Quick Actions</h3>
                <div className="dashboard-actions">
                  <Link to="/profile" className="dashboard-link">
                    Edit Profile
                  </Link>
                  <Link to="/settings/change-password" className="dashboard-link">
                    Change Password
                  </Link>
                </div>
              </section>

              <section className="dashboard-main-block">
                <h3>{roleBlock.title}</h3>
                <div className="dashboard-actions">
                  {roleBlock.links.map(({ to, label }) => (
                    <Link key={to + label} to={to} className="dashboard-link">
                      {label}
                    </Link>
                  ))}
                </div>
              </section>

              {showAiUsage && (
                <section className="dashboard-main-block">
                  <h3>AI Preview Usage</h3>
                  {aiUsage ? (
                    <p className="ai-usage-stats">
                      This month: <strong>{aiUsage.totalRequests}</strong> request{aiUsage.totalRequests !== 1 ? 's' : ''}, <strong>{aiUsage.totalTokenCount?.toLocaleString() ?? 0}</strong> tokens
                    </p>
                  ) : (
                    <p className="ai-usage-stats">Loading…</p>
                  )}
                </section>
              )}
            </div>
          </div>

          {isClient && (
            <div className="dashboard-ai-card">
              <div className="dashboard-ai-card-header">
                <h3>AI Project Previews</h3>
                <Link to="/projects" className="dashboard-link dashboard-link-sm">
                  My Projects
                </Link>
              </div>
              <p className="dashboard-ai-card-text">
                Previews you’ve generated. Open a project to view or create more (up to 5 per project).
              </p>
              {previewsLoading ? (
                <p className="dashboard-previews-loading">Loading previews…</p>
              ) : previews.length === 0 ? (
                <p className="dashboard-previews-empty">No previews yet. Open a project and use the AI Previews section to generate one.</p>
              ) : (
                <ul className="dashboard-previews-list">
                  {previews.map((p) => {
                    const projectId = p.projectId?._id || p.projectId
                    return (
                      <li key={p._id} className="dashboard-preview-item">
                        <div className="dashboard-preview-item-main">
                          <span className="dashboard-preview-prompt">
                            {p.prompt?.substring(0, 60)}{(p.prompt?.length || 0) > 60 ? '…' : ''}
                          </span>
                          <span className="dashboard-preview-meta">
                            {new Date(p.createdAt).toLocaleDateString()}
                            <span className={`dashboard-preview-status dashboard-preview-status--${p.status}`}>
                              {p.status}
                            </span>
                          </span>
                        </div>
                        {projectId ? (
                          <Link to={`/projects/${projectId}`} className="dashboard-preview-link">
                            View project
                          </Link>
                        ) : (
                          <span className="dashboard-preview-standalone">Standalone</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}

          {user?.role === 'programmer' && <UserStatus />}
        </div>
      </div>
    </>
  )
}

export default Dashboard

