import { useState, useEffect } from 'react'
import { useRole } from '../../../hooks/useRole'
import { useNotifications } from '../../../context/NotificationContext'
import { projectAPI } from '../../../services/api'
import { loadProjectsForRole } from '../../../utils/projectListLoader'
import { Link } from 'react-router-dom'
import Header from '../../../components/layout-components/Header/Header'
import RoleGate from '../../../components/layout-components/RoleGate/RoleGate'
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
        <h1>Projects</h1>
        <div className="project-list-header-actions">
          <RoleGate allow={['client', 'user']}>
            <Link to="/projects/create" className="btn btn-primary">New Project</Link>
          </RoleGate>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="project-list-empty">
          <p>No projects found.</p>
          <div className="project-list-empty-actions">
            <RoleGate allow={['client', 'user']}>
              <Link to="/projects/create" className="btn btn-primary">
                Create Your First Project
              </Link>
            </RoleGate>
            <Link to="/assignments" className="btn btn-secondary">
              Explore available projects
            </Link>
          </div>
        </div>
      ) : (
        <div className="project-list-grid">
          {projects.map((project) => (
            <Link
              key={project.id || project._id}
              to={`/projects/${project.id || project._id}`}
              className="project-card"
            >
              <div className="project-card-header">
                <h3>{project.title}</h3>
                <span className={`status-badge ${getStatusBadgeClass(project.status)}`}>
                  {project.status}
                </span>
              </div>
              <p className="project-description">
                {project.description?.substring(0, 150)}
                {project.description?.length > 150 ? '...' : ''}
              </p>
              <div className="project-card-footer">
                <div className="project-meta">
                  <span className="project-client">
                    Client: {project.clientId?.name || project.client?.name || 'N/A'}
                  </span>
                  {(project.assignedProgrammerId || project.assignedProgrammer) && (
                    <span className="project-programmer">
                      Programmer: {(project.assignedProgrammerId?.name || project.assignedProgrammer?.name)}
                    </span>
                  )}
                </div>
                <div className="project-dates">
                  {project.startDate && (
                    <span>Started: {new Date(project.startDate).toLocaleDateString()}</span>
                  )}
                  <span className="project-dates-row">
                    {project.dueDate && (
                      <span className="project-due-date">Due: {new Date(project.dueDate).toLocaleDateString()}</span>
                    )}
                    {projectHasUnreadNotifications(project.id || project._id) && (
                      <span className="notification-badge" aria-label="Unread notifications" />
                    )}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      </div>
    </>
  )
}

export default ProjectList
