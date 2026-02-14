import { Button } from '../../../../../components/ui-components'
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
        <Button
          onClick={onMarkReady}
          variant="primary"
          size="md"
          disabled={markingReady}
        >
          {markingReady ? 'Marking...' : 'Mark as Ready'}
        </Button>
      )}
      {canDelete && (
        <Button onClick={onDelete} variant="danger" size="md">
          Delete Project
        </Button>
      )}
    </div>
  )
}

export default ProjectActions
