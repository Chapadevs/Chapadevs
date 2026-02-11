import { Link } from 'react-router-dom'
import { getStatusBadgeClass } from '../../utils/projectUtils'
import './ProjectHeader.css'

const ProjectHeader = ({
  project,
  isClientOwner,
  canDelete,
  onDelete,
  markingReady,
  onMarkReady,
  canMarkReady,
  allTeamConfirmedReady,
  canConfirmReady,
  confirmingReady,
  onConfirmReady,
  canToggleTeamClosed,
  togglingTeamClosed,
  onToggleTeamClosed,
  canStartDevelopment,
  startingDevelopment,
  onStartDevelopment,
  canStopDevelopment,
  stoppingDevelopment,
  onStopDevelopment,
  canSetToHolding,
  markingHolding,
  onMarkHolding,
  isProgrammerInProject,
  leavingProject,
  onLeaveProject,
}) => {
  const showLeaveButton = isProgrammerInProject && onLeaveProject

  return (
    <div className="project-detail-header">
      <div>
        <Link to="/projects" className="project-detail-back">← Back to Projects</Link>
        <div className="project-header-title-row">
          <h1>{project.title}</h1>
          <span className={`project-header-status-badge ${getStatusBadgeClass(project.status)}`}>
            {project.status}
          </span>
        </div>
        <div className="project-header-meta">
          {canToggleTeamClosed && onToggleTeamClosed && (
            <button
              type="button"
              className={`project-header-team-toggle-btn ${project.status === 'Open' ? 'btn-close' : 'btn-open'}`}
              onClick={onToggleTeamClosed}
              disabled={togglingTeamClosed}
            >
              {togglingTeamClosed ? 'Updating...' : project.status === 'Open' ? 'Close Team' : 'Open Team'}
            </button>
          )}
          {canConfirmReady && onConfirmReady && (
            <button
              type="button"
              className="project-header-confirm-ready-btn"
              onClick={onConfirmReady}
              disabled={confirmingReady}
            >
              {confirmingReady ? 'Confirming...' : "I'm Ready"}
            </button>
          )}
          {canMarkReady && onMarkReady && (
            <button
              type="button"
              className="project-header-mark-ready-btn"
              onClick={onMarkReady}
              disabled={markingReady || !allTeamConfirmedReady}
              title={!allTeamConfirmedReady ? 'All team members must confirm they are ready first' : undefined}
            >
              {markingReady ? 'Marking...' : 'Mark Ready'}
            </button>
          )}
          {canStartDevelopment && onStartDevelopment && (
            <button
              type="button"
              className="project-header-start-dev-btn"
              onClick={onStartDevelopment}
              disabled={startingDevelopment}
            >
              {startingDevelopment ? 'Starting...' : 'Start Development'}
            </button>
          )}
          {canStopDevelopment && onStopDevelopment && (
            <button
              type="button"
              className="project-header-stop-dev-btn"
              onClick={onStopDevelopment}
              disabled={stoppingDevelopment}
            >
              {stoppingDevelopment ? 'Stopping...' : 'Stop Development'}
            </button>
          )}
          {canSetToHolding && onMarkHolding && (
            <button
              type="button"
              className="project-header-on-hold-btn"
              onClick={onMarkHolding}
              disabled={markingHolding}
            >
              {markingHolding ? 'Updating...' : 'Set to On Hold'}
            </button>
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
