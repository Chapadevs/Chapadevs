import { useState, useEffect } from 'react'
import { useRole } from '../../../hooks/useRole'
import { Link } from 'react-router-dom'
import Header from '../../../components/layout-components/Header/Header'
import { Button, Card, Badge, PageTitle, SectionTitle } from '../../../components/ui-components'
import { getAIPreviewUsage, projectAPI } from '../../../services/api'
import { getRoleDisplayLabel } from '../../../utils/roles'
import { getDashboardConfigForRole } from '../../../utils/dashboardRoleConfig'
import { loadProjectsForRole } from '../../../utils/projectListLoader'
import './Dashboard.css'

const getStatusBadgeClass = (status) => {
  const statusMap = {
    Holding: 'dashboard-project-status--holding',
    Ready: 'dashboard-project-status--ready',
    Development: 'dashboard-project-status--development',
    Completed: 'dashboard-project-status--completed',
    Cancelled: 'dashboard-project-status--cancelled',
  }
  return statusMap[status] || 'dashboard-project-status--default'
}

const Dashboard = () => {
  const { user } = useRole()
  const [aiUsage, setAiUsage] = useState(null)
  const [showAiUsageDetails, setShowAiUsageDetails] = useState(false)
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(true)

  const roleConfig = getDashboardConfigForRole(user?.role)
  const showAiUsage = roleConfig.showAiUsage

  useEffect(() => {
    if (!showAiUsage) return
    getAIPreviewUsage('month')
      .then((data) => setAiUsage(data))
      .catch(() => setAiUsage(null))
  }, [showAiUsage])

  useEffect(() => {
    const loadProjects = async () => {
      if (!user) return
      setProjectsLoading(true)
      try {
        const data = await loadProjectsForRole(projectAPI, user)
        setProjects(Array.isArray(data) ? data : [])
      } catch {
        setProjects([])
      } finally {
        setProjectsLoading(false)
      }
    }
    loadProjects()
  }, [user])

  const roleBlock = { title: roleConfig.title, links: roleConfig.links }
  const roleBadgeClass = user?.role === 'user' ? 'role-badge--client' : `role-badge--${user?.role}`

  const projectStats = projects.reduce(
    (acc, p) => {
      const s = (p.status || '').toLowerCase()
      acc.total++
      if (s === 'holding') acc.holding++
      else if (s === 'ready') acc.ready++
      else if (s === 'development') acc.development++
      else if (s === 'completed') acc.completed++
      else if (s === 'cancelled') acc.cancelled++
      return acc
    },
    { total: 0, holding: 0, ready: 0, development: 0, completed: 0, cancelled: 0 }
  )
  const recentProjects = projects.slice(0, 4)

  return (
    <>
      <Header />
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="dashboard-header-left">
            <PageTitle>Dashboard</PageTitle>
            <Badge variant={user?.role || 'default'} className={`role-badge ${roleBadgeClass} dashboard-role-badge`}>
              {getRoleDisplayLabel(user?.role)}
            </Badge>
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
              <Card variant="accent" as="section" className="dashboard-main-block dashboard-main-block--projects p-6">
                <SectionTitle>{roleBlock.title}</SectionTitle>
                {projectsLoading ? (
                  <div className="dashboard-project-summary">
                    <span className="dashboard-project-count">Loading projects…</span>
                  </div>
                ) : (
                  <>
                    <div className="dashboard-project-summary">
                      <span className="dashboard-project-count">
                        {projectStats.total === 0
                          ? 'No projects yet.'
                          : `${projectStats.total} project${projectStats.total !== 1 ? 's' : ''}`}
                      </span>
                      {projectStats.total > 0 && (
                        <span className="dashboard-project-breakdown">
                          {[
                            projectStats.development > 0 && `${projectStats.development} in development`,
                            projectStats.ready > 0 && `${projectStats.ready} ready`,
                            projectStats.holding > 0 && `${projectStats.holding} on hold`,
                            projectStats.completed > 0 && `${projectStats.completed} completed`,
                            projectStats.cancelled > 0 && `${projectStats.cancelled} cancelled`,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      )}
                    </div>
                    {recentProjects.length > 0 && (
                      <div className="dashboard-project-list-section">
                        <span className="dashboard-project-list-label">Recent projects</span>
                        <ul className="dashboard-project-list">
                          {recentProjects.map((project) => (
                            <li key={project.id || project._id}>
                              <Link
                                to={`/projects/${project.id || project._id}`}
                                className="dashboard-project-link"
                              >
                                <span className="dashboard-project-title">{project.title || 'Untitled'}</span>
                                <span className={`dashboard-project-status ${getStatusBadgeClass(project.status)}`}>
                                  {project.status || '—'}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="dashboard-actions">
                      {roleBlock.links.map(({ to, label }) => (
                        <Button key={to + label} to={to} variant="primary" size="sm" className="dashboard-link">
                          {label}
                        </Button>
                      ))}
                    </div>
                  </>
                )}
              </Card>

              {showAiUsage && (
                <Card variant="accent" as="section" className="dashboard-main-block p-6">
                  <SectionTitle>AI Preview Usage</SectionTitle>
                  <div className="dashboard-usage-row">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="dashboard-link dashboard-usage-toggle"
                      onClick={() => setShowAiUsageDetails((v) => !v)}
                    >
                      {showAiUsageDetails ? 'Hide Usage' : 'View Usage'}
                    </Button>
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
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Dashboard

