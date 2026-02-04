import { Link } from 'react-router-dom'
import { getStatusBadgeClass } from '../../utils/projectUtils'
import './ProjectHeader.css'

const ProjectHeader = ({ project, isClientOwner, markingHolding, onMarkHolding }) => {
  // Check if project has any assigned programmers
  const hasProgrammers = project.assignedProgrammerId || 
    (project.assignedProgrammerIds && project.assignedProgrammerIds.length > 0)
  
  // Only show button if Ready status, client owner, and no programmers assigned
  const showHoldingButton = isClientOwner && 
    project.status === 'Ready' && 
    !hasProgrammers

  return (
    <div className="project-detail-header">
      <div>
        <Link to="/projects" className="project-detail-back">← Back to Projects</Link>
        <h1>{project.title}</h1>
        <div className="project-header-meta">
          <span className={`status-badge ${getStatusBadgeClass(project.status)}`}>
            {project.status}
          </span>
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
