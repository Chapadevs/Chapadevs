import { Link } from 'react-router-dom'
import { getStatusBadgeClass } from '../../utils/projectUtils'
import './ProjectHeader.css'

const ProjectHeader = ({ project }) => {
  return (
    <div className="project-detail-header">
      <div>
        <Link to="/projects" className="project-detail-back">← Back to Projects</Link>
        <h1>{project.title}</h1>
        <div className="project-header-meta">
          <span className={`status-badge ${getStatusBadgeClass(project.status)}`}>
            {project.status}
          </span>
        </div>
      </div>
    </div>
  )
}

export default ProjectHeader
