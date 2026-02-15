import { useState, useEffect } from 'react'
import { useRole } from '../../../hooks/useRole'
import { useNotifications } from '../../../context/NotificationContext'
import { projectAPI } from '../../../services/api'
import { loadProjectsForRole } from '../../../utils/projectListLoader'
import { Link } from 'react-router-dom'
import Header from '../../../components/layout-components/Header/Header'
import RoleGate from '../../../components/layout-components/RoleGate/RoleGate'
import { Button, Badge, PageTitle, Card } from '../../../components/ui-components'
import '../../../components/user-components/NotificationBadge/NotificationBadge.css'
import './ProjectList.css'

const ProjectList = () => {
  const { user } = useRole()
  const { notifications, loadNotifications } = useNotifications()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadProjects = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await loadProjectsForRole(projectAPI, user)
      setProjects(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) loadProjects()
  }, [user])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const projectHasUnreadNotifications = (projectId) => {
    const id = projectId?.toString?.() || projectId
    return notifications.some(
      (n) => !n.isRead && (n.projectId?._id?.toString() === id || n.projectId?.toString() === id)
    )
  }

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      'Holding': 'status-holding',
      'Open': 'status-open',
      'Ready': 'status-ready',
      'Development': 'status-development',
      'Completed': 'status-completed',
      'Cancelled': 'status-cancelled',
    }
    return statusMap[status] || 'status-default'
  }

  if (loading) {
    return <div className="project-list-loading">Loading projects...</div>
  }

  if (error) {
    return <div className="project-list-error">Error: {error}</div>
  }

  return (
    <>
      <Header />
      <div className="project-list-container">
      <div className="project-list-header">
        <PageTitle>Projects</PageTitle>
        <div className="project-list-header-actions">
          <RoleGate allow={['client', 'user']}>
            <Button to="/projects/create" variant="ghost" size="md">New Project</Button>
          </RoleGate>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="project-list-empty">
          <p>No projects found.</p>
          <div className="project-list-empty-actions">
            <RoleGate allow={['client', 'user']}>
              <Button to="/projects/create" variant="primary" size="md">
                Create Your First Project
              </Button>
            </RoleGate>
            <Button to="/assignments" variant="secondary" size="md">
              Explore available projects
            </Button>
          </div>
        </div>
      ) : (
        <div className="project-list-grid">
          {projects.map((project) => (
            <Card
              as={Link}
              key={project.id || project._id}
              to={`/projects/${project.id || project._id}`}
              variant="accent"
              className="project-card px-5 py-5 flex flex-col no-underline hover:shadow-lg transition-shadow duration-300"
            >
              <div className="project-card-header flex justify-between items-start mb-3">
                <h3 className="font-heading text-base text-ink uppercase tracking-wide m-0 mr-3 flex-1 border-none p-0">{project.title}</h3>
                <Badge variant={project.status?.toLowerCase() || 'default'}>
                  {project.status}
                </Badge>
              </div>
              <p className="text-ink-secondary text-sm mb-4 flex-1">
                {project.description?.substring(0, 150)}
                {project.description?.length > 150 ? '...' : ''}
              </p>
              <div className="mt-auto pt-3 border-t border-border">
                <div className="flex flex-col gap-1 mb-2 text-xs text-ink-muted">
                  <span>
                    Client: {project.clientId?.name || project.client?.name || 'N/A'}
                  </span>
                  {(project.assignedProgrammerId || project.assignedProgrammer) && (
                    <span>
                      Programmer: {(project.assignedProgrammerId?.name || project.assignedProgrammer?.name)}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1 text-xs text-ink-muted">
                  {project.startDate && (
                    <span>Started: {new Date(project.startDate).toLocaleDateString()}</span>
                  )}
                  <span className="flex items-center justify-between gap-2">
                    {project.dueDate && (
                      <span>Due: {new Date(project.dueDate).toLocaleDateString()}</span>
                    )}
                    {projectHasUnreadNotifications(project.id || project._id) && (
                      <span className="notification-badge" aria-label="Unread notifications" />
                    )}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      </div>
    </>
  )
}

export default ProjectList
