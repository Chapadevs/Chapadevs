import './ProjectActions.css'

const ProjectActions = ({
  canMarkReady,
  canDelete,
  markingReady,
  onMarkReady,
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
      {canDelete && (
        <button onClick={onDelete} className="btn btn-danger">
          Delete Project
        </button>
      )}
    </div>
  )
}

export default ProjectActions
