import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Link } from 'react-router-dom'
import Header from '../../components/Header/Header'
import UserStatus from '../../components/UserStatus/UserStatus'
import AIPreviewGenerator from '../../components/AIPreviewGenerator/AIPreviewGenerator'
import { getAIPreviewUsage } from '../../services/api'
import './Dashboard.css'

const Dashboard = () => {
  const { user } = useAuth()
  const [aiUsage, setAiUsage] = useState(null)
  const showAiUsage = user?.role === 'client' || user?.role === 'user'

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
                <span className={`role-badge role-badge--${user?.role}`}>{user?.role?.toUpperCase()}</span>
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

          {(user?.role === 'programmer' || user?.role === 'client') && (
            <UserStatus />
          )}

          {(user?.role === 'client' || user?.role === 'user') && <AIPreviewGenerator />}
        </div>
      </div>
    </>
  )
}

export default Dashboard

