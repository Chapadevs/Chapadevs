import { useState, useEffect } from 'react'
import { useRole } from '../../hooks/useRole'
import { assignmentAPI, userAPI } from '../../services/api'
import { Link } from 'react-router-dom'
import Header from '../../components/layout-components/Header/Header'
import RoleGate from '../../components/layout-components/RoleGate/RoleGate'
import './Assignment.css'

const Assignment = () => {
  const { user, isAdmin, isProgrammer } = useRole()
  const [availableProjects, setAvailableProjects] = useState([])
  const [programmers, setProgrammers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [assigning, setAssigning] = useState({})

  useEffect(() => {
    loadData()
  }, [user?.role])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (isAdmin) {
        const [projects, programmersData] = await Promise.all([
          assignmentAPI.getAvailablePublic(),
          userAPI.getProgrammers(),
        ])
        setAvailableProjects(projects)
        setProgrammers(programmersData)
      } else {
        // Use public endpoint for everyone (guests, clients, programmers) – same project list
        const projects = await assignmentAPI.getAvailablePublic()
        setAvailableProjects(projects)
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
      'Open': 'status-open',
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
          {isAdmin ? 'Project Assignments' : 'Available Projects'}
        </h2>
        {!isAdmin && (
          <p className="assignment-subtitle">
            Projects ready for developers to join. Sign in to apply.
          </p>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {availableProjects.length === 0 ? (
        <div className="assignment-empty">
          <p>No available projects at the moment.</p>
          <p className="assignment-empty-hint">
            Projects appear here after a client <strong>opens the team</strong>. Clients can do this from the project detail page (open a project → &quot;Open Team&quot;).
          </p>
        </div>
      ) : (
        <div className="assignment-grid">
          {availableProjects.map((project) => {
            const projectId = project.id || project._id
            return (
            <div key={projectId} className="assignment-card">
              <div className="assignment-card-header">
                <Link
                  to={{
                    pathname: `/projects/${projectId}`,
                    state: {
                      description: project.description,
                      title: project.title,
                      status: project.status,
                      projectType: project.projectType,
                      budget: project.budget,
                      timeline: project.timeline,
                      priority: project.priority,
                      client: project.client,
                    },
                  }}
                  className="project-link"
                >
                  <h1>{project.title}</h1>
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
                <RoleGate allow={['programmer']}>
                  {(() => {
                    const userIdStr = (user?._id || user?.id)?.toString()
                    const assignedIds = project.assignedProgrammerIds || []
                    const isAlreadyJoined = project.assignedProgrammerId?.toString() === userIdStr ||
                      assignedIds.some(id => (id?._id || id)?.toString() === userIdStr)
                    return (
                      <>
                        {(project.assignedProgrammerId || (assignedIds && assignedIds.length > 0)) && (
                          <div className="project-assigned-notice">
                            <span className="assigned-badge">
                              ✓ {assignedIds.length > 0 ? `${assignedIds.length} programmer${assignedIds.length > 1 ? 's' : ''} joined` : project.assignedProgrammerId ? `Assigned to ${project.assignedProgrammerId?.name || 'a programmer'}` : 'Assigned'}
                            </span>
                          </div>
                        )}
                        {project.teamClosed && (
                          <p className="team-closed-message">This project&apos;s team is closed. No more programmers can join.</p>
                        )}
                        {isAlreadyJoined && !project.teamClosed && (
                          <p className="team-closed-message">You have already joined this project.</p>
                        )}
                        <button
                          onClick={() => handleAccept(projectId)}
                          className="btn btn-primary"
                          disabled={assigning[projectId] || project.teamClosed || isAlreadyJoined}
                        >
                          {assigning[projectId] ? 'Joining...' :
                            isAlreadyJoined ? 'Already Joined' :
                              project.teamClosed ? 'Team Closed' :
                                'Join'}
                        </button>
                      </>
                    )
                  })()}
                </RoleGate>

                <RoleGate allow={['admin']}>
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
                </RoleGate>

                <Link
                  to={{
                    pathname: `/projects/${projectId}`,
                    state: {
                      description: project.description,
                      title: project.title,
                      status: project.status,
                      projectType: project.projectType,
                      budget: project.budget,
                      timeline: project.timeline,
                      priority: project.priority,
                      client: project.client,
                    },
                  }}
                  className="btn btn-secondary"
                >
                  Details
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
