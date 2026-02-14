import { SectionTitle } from '../../../../../components/ui-components'
import './ProjectInfoSection.css'

const ProjectInfoSection = ({ project }) => {
  return (
    <section className="project-section project-info-section">
      <SectionTitle className="project-tab-panel-title mb-4">Project Information</SectionTitle>
      <div className="project-info-grid">
        <div className="info-item">
          <strong>Client:</strong>
          <span>{project.clientId?.name ?? 'N/A'}</span>
        </div>
        {project.assignedProgrammerId && (
          <div className="info-item">
            <strong>Programmer:</strong>
            <span>{project.assignedProgrammerId.name}</span>
          </div>
        )}
        {project.phases && project.phases.length > 0 && (
          <div className="info-item">
            <strong>Progress:</strong>
            <span>
              {project.phases.filter((p) => p.status === 'completed').length} / {project.phases.length} phases
            </span>
          </div>
        )}
        {project.budget && (
          <div className="info-item">
            <strong>Budget:</strong>
            <span>{project.budget}</span>
          </div>
        )}
        {project.timeline && (
          <div className="info-item">
            <strong>Timeline:</strong>
            <span>{project.timeline}</span>
          </div>
        )}
        {project.startDate && (
          <div className="info-item">
            <strong>Start Date:</strong>
            <span>{new Date(project.startDate).toLocaleDateString()}</span>
          </div>
        )}
        {project.dueDate && (
          <div className="info-item">
            <strong>Due Date:</strong>
            <span>{new Date(project.dueDate).toLocaleDateString()}</span>
          </div>
        )}
        <div className="info-item">
          <strong>Created:</strong>
          <span>{new Date(project.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </section>
  )
}

export default ProjectInfoSection
