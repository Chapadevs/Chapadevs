import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { projectAPI } from '../../services/api'
import { Link } from 'react-router-dom'
import Header from '../Header/Header'
import './ProjectList.css'

const ProjectList = () => {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      setError(null)
      let data
      
      if (user?.role === 'client') {
        data = await projectAPI.getMyProjects()
      } else if (user?.role === 'programmer') {
        data = await projectAPI.getAssignedProjects()
      } else {
        data = await projectAPI.getAll()
      }
      
      setProjects(data)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      'Holding': 'status-holding',
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
        <h2>Projects</h2>
        {(user?.role === 'client' || user?.role === 'user') && (
          <Link to="/projects/create" className="btn btn-primary">
            Create New Project
          </Link>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="project-list-empty">
          <p>No projects found.</p>
          {(user?.role === 'client' || user?.role === 'user') && (
            <Link to="/projects/create" className="btn btn-primary">
              Create Your First Project
            </Link>
          )}
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
                    Client: {project.client?.name || 'N/A'}
                  </span>
                  {project.assignedProgrammer && (
                    <span className="project-programmer">
                      Programmer: {project.assignedProgrammer.name}
                    </span>
                  )}
                </div>
                <div className="project-dates">
                  {project.startDate && (
                    <span>Started: {new Date(project.startDate).toLocaleDateString()}</span>
                  )}
                  {project.dueDate && (
                    <span>Due: {new Date(project.dueDate).toLocaleDateString()}</span>
                  )}
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

