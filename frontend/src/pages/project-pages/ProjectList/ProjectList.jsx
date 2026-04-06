import { useState, useEffect } from 'react'
import { useRole } from '../../../hooks/useRole'
import { useNotifications } from '../../../context/NotificationContext'
import { projectAPI } from '../../../services/api'
import { loadProjectsForRole } from '../../../utils/projectListLoader'
import { formatDateOnly } from '../../../utils/dateUtils'
import { Link } from 'react-router-dom'
import Header from '../../../components/layout-components/Header/Header'
import { Button, Badge, PageTitle, Card } from '../../../components/ui-components'
import './ProjectList.css'

const ProjectList = () => {
  const { user, isClient } = useRole()
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
          {isClient ? (
            <>
              <Button to="/ideas" variant="primary" size="md">Explore Website Ideas</Button>
              <Button to="/projects/create" variant="secondary" size="md">New Project</Button>
            </>
          ) : null}
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="project-list-empty">
          <p>No projects found.</p>
          <div className="project-list-empty-actions">
            {isClient ? (
              <>
                <Button to="/ideas" variant="primary" size="md">
                  Explore Website Ideas
                </Button>
                <Button to="/projects/create" variant="secondary" size="md">
                  Create Your First Project
                </Button>
              </>
            ) : null}
            <Button to="/assignments" variant="secondary" size="md">
              Explore available projects
            </Button>
          </div>
        </div>
      ) : (
        <div className="project-list-grid">
          {projects.map((project) => (
          <Link
          key={project.id || project._id}
          to={`/projects/${project.id || project._id}`}
          className="no-underline"
          >

            <Card
              variant="accent"
              className="px-6 py-6 flex flex-col no-underline hover:shadow-lg transition-shadow duration-300 h-[320px]"
            >
              <div className="flex justify-between items-start gap-3 mb-4 shrink-0">
                <h3 className="font-heading text-lg text-ink uppercase tracking-wide m-0 flex-1 min-w-0 line-clamp-2">{project.title}</h3>
                <Badge variant={project.status?.toLowerCase() || 'default'} className="shrink-0">
                  {project.status}
                </Badge>
              </div>
              <p className="font-body text-ink-secondary text-sm leading-relaxed mb-5 flex-1 min-h-0 overflow-hidden line-clamp-4">
                {project.description?.substring(0, 180)}
                {project.description?.length > 180 ? '...' : ''}
              </p>
              <div className="mt-auto pt-4 border-t border-border shrink-0 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-ink-muted font-body">
                <div className="flex flex-col gap-1.5">
                  <span>Client: {project.clientId?.name || project.client?.name || 'N/A'}</span>
                  {(project.assignedProgrammerId || project.assignedProgrammer) && (
                    <span>Programmer: {(project.assignedProgrammerId?.name || project.assignedProgrammer?.name)}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  {project.startDate && (
                    <span>Started: {formatDateOnly(project.startDate)}</span>
                  )}
                  <span className="flex items-center gap-2">
                    {project.dueDate && (
                      <span>Due: {formatDateOnly(project.dueDate)}</span>
                    )}
                    {projectHasUnreadNotifications(project.id || project._id) && (
                      <span className="notification-badge" aria-label="Unread notifications" />
                    )}
                  </span>
                </div>
              </div>
            </Card>
            </Link>
          ))}
        </div>
      )}
      </div>
    </>
  )
}

export default ProjectList
