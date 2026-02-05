import { Link } from 'react-router-dom'
import { getStatusBadgeClass } from '../../utils/projectUtils'
import './ProjectHeader.css'

const ProjectHeader = ({ project, isClientOwner, markingHolding, markingReady, onMarkHolding, onMarkReady }) => {
  // Check if project has any assigned programmers
  const hasProgrammers = project.assignedProgrammerId || 
    (project.assignedProgrammerIds && project.assignedProgrammerIds.length > 0)
  
  // Show "Set to Holding" button if Ready status, client owner, and no programmers assigned
  const showHoldingButton = isClientOwner && 
    project.status === 'Ready' && 
    !hasProgrammers

  // Show "Mark as Ready" button if Holding status and client owner
  const showReadyButton = isClientOwner && 
    project.status === 'Holding'

  return (
    <div className="project-detail-header">
      <div>
        <Link to="/projects" className="project-detail-back">← Back to Projects</Link>
        <h1>{project.title}</h1>
        <div className="project-header-meta">
          <span className={`status-badge ${getStatusBadgeClass(project.status)}`}>
            {project.status}
          </span>
          {showReadyButton && (
            <button
              className="project-status-button"
              onClick={onMarkReady}
              disabled={markingReady}
            >
              {markingReady ? 'Marking...' : 'Mark as Ready'}
            </button>
          )}
          {showHoldingButton && (
            <button
              className="project-status-button"
              onClick={onMarkHolding}
              disabled={markingHolding}
            >
              {markingHolding ? 'Changing...' : 'Set to Holding'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProjectHeader
