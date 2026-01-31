import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Link } from 'react-router-dom'
import Header from '../../components/Header/Header'
import UserStatus from '../../components/UserStatus/UserStatus'
import { getAIPreviewUsage } from '../../services/api'
import './Dashboard.css'

const Dashboard = () => {
  const { user } = useAuth()
  const [aiUsage, setAiUsage] = useState(null)
  const [showAiUsageDetails, setShowAiUsageDetails] = useState(false)
  const isClient = user?.role === 'client' || user?.role === 'user'
  const showAiUsage = isClient

  useEffect(() => {
    if (!showAiUsage) return
    getAIPreviewUsage('month')
      .then((data) => setAiUsage(data))
      .catch(() => setAiUsage(null))
  }, [showAiUsage])

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
            <span className={`role-badge ${roleBadgeClass} dashboard-role-badge`}>
              {user?.role === 'user' ? 'CLIENT' : user?.role?.toUpperCase()}
            </span>
            <h1>Dashboard</h1>
            {user?.company && (
              <div className="dashboard-user-info">
                <span className="dashboard-user-meta">{user.company}</span>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-content">
          <div className="dashboard-main-card">
            <div className="dashboard-main-grid">
              <section className="dashboard-main-block">
                <h3>Profile</h3>
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
                  <div className="dashboard-usage-row">
                    <button
                      type="button"
                      className="dashboard-link dashboard-usage-toggle"
                      onClick={() => setShowAiUsageDetails((v) => !v)}
                    >
                      {showAiUsageDetails ? 'Hide Usage' : 'View Usage'}
                    </button>
                    {showAiUsageDetails && (
                      <span className="ai-usage-stats">
                        {aiUsage ? (
                          <>This month: <strong>{aiUsage.totalRequests}</strong> request{aiUsage.totalRequests !== 1 ? 's' : ''}, <strong>{aiUsage.totalTokenCount?.toLocaleString() ?? 0}</strong> tokens</>
                        ) : (
                          'Loading…'
                        )}
                      </span>
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>

          {user?.role === 'programmer' && <UserStatus />}
        </div>
      </div>
    </>
  )
}

export default Dashboard

