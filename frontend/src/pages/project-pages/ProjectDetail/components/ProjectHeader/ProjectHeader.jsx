import { Link } from 'react-router-dom'
import './ProjectHeader.css'

const ProjectHeader = ({
  project,
  isClientOwner,
  canDelete,
  onDelete,
  markingHolding,
  markingReady,
  onMarkHolding,
  onMarkReady,
  isProgrammerInProject,
  leavingProject,
  onLeaveProject,
}) => {
  const canSwitchToHolding = isClientOwner && project.status === 'Ready'
  const canSwitchToReady = isClientOwner && project.status === 'Holding'
  const showStatusSwitch = isClientOwner && (project.status === 'Ready' || project.status === 'Holding')
  const showLeaveButton = isProgrammerInProject && onLeaveProject
  const isBusy = markingReady || markingHolding

  const handleSwitchToReady = () => {
    if (project.status !== 'Ready' && canSwitchToReady && !isBusy) onMarkReady()
  }
  const handleSwitchToHolding = () => {
    if (project.status !== 'Holding' && canSwitchToHolding && !isBusy) onMarkHolding()
  }

  return (
    <div className="project-detail-header">
      <div>
        <Link to="/projects" className="project-detail-back">← Back to Projects</Link>
        <h1>{project.title}</h1>
        <div className="project-header-meta">
          {showStatusSwitch && (
            <div className="project-status-switch" role="group" aria-label="Project status">
              <button
                type="button"
                className={`project-status-switch-option ${project.status === 'Holding' ? 'active' : ''}`}
                onClick={handleSwitchToHolding}
                disabled={isBusy || (project.status === 'Ready' && !canSwitchToHolding)}
                aria-pressed={project.status === 'Holding'}
              >
                On Hold
              </button>
              <button
                type="button"
                className={`project-status-switch-option ${project.status === 'Ready' ? 'active' : ''}`}
                onClick={handleSwitchToReady}
                disabled={isBusy || (project.status === 'Holding' && !canSwitchToReady)}
                aria-pressed={project.status === 'Ready'}
              >
                Ready
              </button>
            </div>
          )}
          {showLeaveButton && (
            <button
              type="button"
              className="project-header-leave-btn"
              onClick={onLeaveProject}
              disabled={leavingProject}
            >
              {leavingProject ? 'Leaving...' : 'Leave Project'}
            </button>
          )}
          {canDelete && onDelete && (
            <button
              type="button"
              className="project-header-delete-btn"
              onClick={onDelete}
              aria-label="Delete project"
            >
              Delete project
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProjectHeader
