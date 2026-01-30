import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { assignmentAPI, userAPI, projectAPI } from '../../services/api'
import { Link } from 'react-router-dom'
import Header from '../Header/Header'
import './Assignment.css'

const Assignment = () => {
  const { user } = useAuth()
  const [availableProjects, setAvailableProjects] = useState([])
  const [programmers, setProgrammers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [assigning, setAssigning] = useState({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (user?.role === 'programmer') {
        const projects = await assignmentAPI.getAvailable()
        setAvailableProjects(projects)
      } else if (user?.role === 'admin') {
        const [projects, programmersData] = await Promise.all([
          assignmentAPI.getAvailable(),
          userAPI.getProgrammers(),
        ])
        setAvailableProjects(projects)
        setProgrammers(programmersData)
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (projectId) => {
    try {
      setAssigning((prev) => ({ ...prev, [projectId]: true }))
      setError(null)
      await assignmentAPI.accept(projectId)
      await loadData() // Reload to update the list
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to accept project')
    } finally {
      setAssigning((prev) => ({ ...prev, [projectId]: false }))
    }
  }

  const handleAssign = async (projectId, programmerId) => {
    try {
      setAssigning((prev) => ({ ...prev, [projectId]: true }))
      setError(null)
      await assignmentAPI.assign(projectId, programmerId)
      await loadData() // Reload to update the list
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to assign project')
    } finally {
      setAssigning((prev) => ({ ...prev, [projectId]: false }))
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
    return <div className="assignment-loading">Loading available projects...</div>
  }

  return (
    <>
      <Header />
      <div className="assignment-container">
      <div className="assignment-header">
        <h2>
          {user?.role === 'programmer' ? 'Available Projects' : 'Project Assignments'}
        </h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      {availableProjects.length === 0 ? (
        <div className="assignment-empty">
          <p>No available projects at the moment.</p>
        </div>
      ) : (
        <div className="assignment-grid">
          {availableProjects.map((project) => {
            const projectId = project.id || project._id
            return (
            <div key={projectId} className="assignment-card">
              <div className="assignment-card-header">
                <Link to={`/projects/${projectId}`} className="project-link">
                  <h3>{project.title}</h3>
                </Link>
                <span className={`status-badge ${getStatusBadgeClass(project.status)}`}>
                  {project.status}
                </span>
              </div>
              
              <p className="project-description">
                {project.description?.substring(0, 150)}
                {project.description?.length > 150 ? '...' : ''}
              </p>

              <div className="project-meta">
                <div className="meta-item">
                  <strong>Client:</strong> {project.client?.name || 'N/A'}
                </div>
                {project.client?.company && (
                  <div className="meta-item">
                    <strong>Company:</strong> {project.client.company}
                  </div>
                )}
                {project.budget && (
                  <div className="meta-item">
                    <strong>Budget:</strong> {project.budget}
                  </div>
                )}
                {project.timeline && (
                  <div className="meta-item">
                    <strong>Timeline:</strong> {project.timeline}
                  </div>
                )}
              </div>

              <div className="assignment-actions">
                {user?.role === 'programmer' && (
                  <button
                    onClick={() => handleAccept(projectId)}
                    className="btn btn-primary"
                    disabled={assigning[projectId]}
                  >
                    {assigning[projectId] ? 'Accepting...' : 'Accept Project'}
                  </button>
                )}

                {user?.role === 'admin' && (
                  <div className="admin-assignment">
                    <select
                      className="programmer-select"
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAssign(projectId, e.target.value)
                        }
                      }}
                      disabled={assigning[projectId]}
                    >
                      <option value="">Select Programmer</option>
                      {programmers
                        .filter((p) => p.status === 'Available' || p.status === 'Busy')
                        .map((programmer) => (
                          <option key={programmer.id} value={programmer.id}>
                            {programmer.name} ({programmer.status})
                          </option>
                        ))}
                    </select>
                    {assigning[projectId] && (
                      <span className="assigning-indicator">Assigning...</span>
                    )}
                  </div>
                )}

                <Link
                  to={`/projects/${projectId}`}
                  className="btn btn-secondary"
                >
                  View Details
                </Link>
              </div>
            </div>
          )})}
        </div>
      )}
      </div>
    </>
  )
}

export default Assignment

