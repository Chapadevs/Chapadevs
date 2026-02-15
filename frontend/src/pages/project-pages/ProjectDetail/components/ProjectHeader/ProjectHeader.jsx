import { getStatusBadgeClass } from '../../utils/projectUtils'
import { Button, Badge } from '../../../../../components/ui-components'

const ProjectHeader = ({ project }) => {
  return (
    <div className="flex flex-col gap-4">
      <Button 
        to="/projects" 
        variant="ghost" 
        size="sm" 
        className="w-fit text-ink-muted hover:text-ink pl-0"
      >
        ← Back to Projects
      </Button>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{project.title}</h1>
          <Badge 
            variant={project.status?.toLowerCase() || 'default'} 
            className={getStatusBadgeClass(project.status)}
          >
            {project.status}
          </Badge>
        </div>
      </div>
    </div>
  )
}

export default ProjectHeader