import './ProjectActions.css'

const ProjectActions = ({
  canMarkReady,
  canToggleTeamClosed,
  canDelete,
  markingReady,
  togglingTeamClosed,
  project,
  onMarkReady,
  onToggleTeamClosed,
  onDelete,
}) => {
  return (
    <div className="project-actions">
      {canMarkReady && (
        <button
          onClick={onMarkReady}
          className="btn btn-primary"
          disabled={markingReady}
        >
          {markingReady ? 'Marking...' : 'Mark as Ready'}
        </button>
      )}
      {canToggleTeamClosed && (
        <button
          onClick={onToggleTeamClosed}
          className={`btn ${project.teamClosed ? 'btn-success' : 'btn-warning'}`}
          disabled={togglingTeamClosed}
        >
          {togglingTeamClosed ? 'Updating...' : project.teamClosed ? 'Open Team' : 'Close Team'}
        </button>
      )}
      {canDelete && (
        <button onClick={onDelete} className="btn btn-danger">
          Delete Project
        </button>
      )}
    </div>
  )
}

export default ProjectActions
