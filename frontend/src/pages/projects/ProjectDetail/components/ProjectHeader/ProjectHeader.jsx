import { Link } from 'react-router-dom'
import './ProjectHeader.css'

const ProjectHeader = ({ project, isClientOwner, markingHolding, markingReady, onMarkHolding, onMarkReady }) => {
  const canSwitchToHolding = isClientOwner && project.status === 'Ready'
  const canSwitchToReady = isClientOwner && project.status === 'Holding'
  const showStatusSwitch = project.status === 'Ready' || project.status === 'Holding'
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
        </div>
      </div>
    </div>
  )
}

export default ProjectHeader
