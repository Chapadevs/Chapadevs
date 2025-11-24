import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { projectAPI } from '../../services/api'
import Header from '../Header/Header'
import './ProjectDetail.css'

const ProjectDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [markingReady, setMarkingReady] = useState(false)

  useEffect(() => {
    loadProject()
  }, [id])

  const loadProject = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await projectAPI.getById(id)
      setProject(data)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkReady = async () => {
    if (!window.confirm('Mark this project as Ready for assignment?')) {
      return
    }

    try {
      setMarkingReady(true)
      setError(null)
      const updatedProject = await projectAPI.markReady(id)
      setProject(updatedProject)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to mark project as ready')
    } finally {
      setMarkingReady(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }

    try {
      await projectAPI.delete(id)
      navigate('/projects')
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete project')
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
    return <div className="project-detail-loading">Loading project...</div>
  }

  if (error && !project) {
    return (
      <div className="project-detail-container">
        <div className="error-message">{error}</div>
        <button onClick={() => navigate('/projects')} className="btn btn-secondary">
          Back to Projects
        </button>
      </div>
    )
  }

  if (!project) {
    return <div className="project-detail-container">Project not found</div>
  }

  const userId = user?._id || user?.id
  const canEdit = user?.role === 'client' && project.clientId === userId && ['Holding', 'Ready'].includes(project.status)
  const canDelete = user?.role === 'client' && project.clientId === userId && project.status === 'Holding'
  const canMarkReady = user?.role === 'client' && project.clientId === userId && project.status === 'Holding'

  return (
    <>
      <Header />
      <div className="project-detail-container">
      <div className="project-detail-header">
        <div>
          <button onClick={() => navigate('/projects')} className="btn btn-secondary">
            ← Back to Projects
          </button>
          <h1>{project.title}</h1>
          <div className="project-header-meta">
            <span className={`status-badge ${getStatusBadgeClass(project.status)}`}>
              {project.status}
            </span>
            <span className="project-id">ID: {project.id}</span>
          </div>
        </div>
        <div className="project-actions">
          {canMarkReady && (
            <button
              onClick={handleMarkReady}
              className="btn btn-primary"
              disabled={markingReady}
            >
              {markingReady ? 'Marking...' : 'Mark as Ready'}
            </button>
          )}
          {canDelete && (
            <button onClick={handleDelete} className="btn btn-danger">
              Delete Project
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="project-detail-content">
        <div className="project-main">
          <section className="project-section">
            <h2>Description</h2>
            <p>{project.description}</p>
          </section>

          {project.projectType && (
            <section className="project-section">
              <h2>Project Type</h2>
              <p>{project.projectType}</p>
            </section>
          )}

          {(project.goals?.length > 0 || project.features?.length > 0 || project.technologies?.length > 0) && (
            <section className="project-section">
              <h2>Project Details</h2>
              {project.goals?.length > 0 && (
                <div className="detail-item">
                  <strong>Goals:</strong>
                  <ul>
                    {project.goals.map((goal, idx) => (
                      <li key={idx}>{goal}</li>
                    ))}
                  </ul>
                </div>
              )}
              {project.features?.length > 0 && (
                <div className="detail-item">
                  <strong>Features:</strong>
                  <ul>
                    {project.features.map((feature, idx) => (
                      <li key={idx}>{feature}</li>
                    ))}
                  </ul>
                </div>
              )}
              {project.technologies?.length > 0 && (
                <div className="detail-item">
                  <strong>Technologies:</strong>
                  <ul>
                    {project.technologies.map((tech, idx) => (
                      <li key={idx}>{tech}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {project.brandingDetails && (
            <section className="project-section">
              <h2>Branding</h2>
              <p><strong>Has Branding:</strong> {project.hasBranding}</p>
              <p>{project.brandingDetails}</p>
            </section>
          )}

          {project.specialRequirements && (
            <section className="project-section">
              <h2>Special Requirements</h2>
              <p>{project.specialRequirements}</p>
            </section>
          )}

          {project.additionalComments && (
            <section className="project-section">
              <h2>Additional Comments</h2>
              <p>{project.additionalComments}</p>
            </section>
          )}
        </div>

        <div className="project-sidebar">
          <section className="project-info-card">
            <h3>Project Information</h3>
            <div className="info-item">
              <strong>Client:</strong>
              <span>{project.client?.name || 'N/A'}</span>
            </div>
            {project.assignedProgrammer && (
              <div className="info-item">
                <strong>Assigned Programmer:</strong>
                <span>{project.assignedProgrammer.name}</span>
              </div>
            )}
            {project.budget && (
              <div className="info-item">
                <strong>Budget:</strong>
                <span>{project.budget}</span>
              </div>
            )}
            {project.timeline && (
              <div className="info-item">
                <strong>Timeline:</strong>
                <span>{project.timeline}</span>
              </div>
            )}
            {project.startDate && (
              <div className="info-item">
                <strong>Start Date:</strong>
                <span>{new Date(project.startDate).toLocaleDateString()}</span>
              </div>
            )}
            {project.dueDate && (
              <div className="info-item">
                <strong>Due Date:</strong>
                <span>{new Date(project.dueDate).toLocaleDateString()}</span>
              </div>
            )}
            <div className="info-item">
              <strong>Created:</strong>
              <span>{new Date(project.createdAt).toLocaleDateString()}</span>
            </div>
          </section>
        </div>
      </div>
      </div>
    </>
  )
}

export default ProjectDetail

