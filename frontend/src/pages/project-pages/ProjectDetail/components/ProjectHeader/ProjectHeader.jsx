import { getStatusBadgeClass } from '../../utils/projectUtils'
import { Button, Badge } from '../../../../../components/ui-components'
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
        <Button to="/projects" variant="ghost" size="sm" className="project-detail-back">← Back to Projects</Button>
        <div className="project-header-title-row">
          <h1>{project.title}</h1>
          <Badge variant={project.status?.toLowerCase() || 'default'} className={`project-header-status-badge ${getStatusBadgeClass(project.status)}`}>
            {project.status}
          </Badge>
        </div>
        <div className="project-header-meta">
          {canToggleTeamClosed && onToggleTeamClosed && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className={`project-header-team-toggle-btn ${project.status === 'Open' ? 'btn-close' : 'btn-open'}`}
              onClick={onToggleTeamClosed}
              disabled={togglingTeamClosed}
            >
              {togglingTeamClosed ? 'Updating...' : project.status === 'Open' ? 'Close Team' : 'Open Team'}
            </Button>
          )}
          {canConfirmReady && onConfirmReady && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="project-header-confirm-ready-btn"
              onClick={onConfirmReady}
              disabled={confirmingReady}
            >
              {confirmingReady ? 'Confirming...' : "I'm Ready"}
            </Button>
          )}
          {canMarkReady && onMarkReady && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="project-header-mark-ready-btn"
              onClick={onMarkReady}
              disabled={markingReady || !allTeamConfirmedReady}
              title={!allTeamConfirmedReady ? 'All team members must confirm they are ready first' : undefined}
            >
              {markingReady ? 'Marking...' : 'Mark Ready'}
            </Button>
          )}
          {canStartDevelopment && onStartDevelopment && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="project-header-start-dev-btn"
              onClick={onStartDevelopment}
              disabled={startingDevelopment}
            >
              {startingDevelopment ? 'Starting...' : 'Start Development'}
            </Button>
          )}
          {canStopDevelopment && onStopDevelopment && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="project-header-stop-dev-btn"
              onClick={onStopDevelopment}
              disabled={stoppingDevelopment}
            >
              {stoppingDevelopment ? 'Stopping...' : 'Stop Development'}
            </Button>
          )}
          {canSetToHolding && onMarkHolding && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="project-header-on-hold-btn"
              onClick={onMarkHolding}
              disabled={markingHolding}
            >
              {markingHolding ? 'Updating...' : 'Set to On Hold'}
            </Button>
          )}
          {showLeaveButton && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              className="project-header-leave-btn"
              onClick={onLeaveProject}
              disabled={leavingProject}
            >
              {leavingProject ? 'Leaving...' : 'Leave Project'}
            </Button>
          )}
          {canDelete && onDelete && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              className="project-header-delete-btn"
              onClick={onDelete}
              aria-label="Delete project"
            >
              Delete project
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProjectHeader
