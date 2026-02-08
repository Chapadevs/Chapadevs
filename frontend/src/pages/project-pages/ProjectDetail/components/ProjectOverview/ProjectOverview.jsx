import './ProjectOverview.css'

const ProjectOverview = ({ project }) => {
  return (
    <section className="project-section project-overview">
      <div className="project-overview-row">
        {project.projectType && (
          <span className="project-overview-type">{project.projectType}</span>
        )}
        {(project.goals?.length > 0 || project.features?.length > 0) && (
          <div className="project-overview-meta">
            <span className="project-overview-badges">
              {project.goals?.length > 0 && (
                <span className="project-overview-tag">Goals: {project.goals.join(' · ')}</span>
              )}
              {project.features?.length > 0 && (
                <span className="project-overview-tag">Features: {project.features.join(' · ')}</span>
              )}
            </span>
          </div>
        )}
        <p className="project-overview-description">{project.description}</p>
      </div>
      {(project.brandingDetails || project.specialRequirements || project.additionalComments || (project.technologies?.length > 0)) && (
        <div className="project-more-details">
          <div className="project-more-details-content">
            {project.technologies?.length > 0 && (
              <div className="project-more-detail-row">
                <strong>Tech:</strong> {project.technologies.join(', ')}
              </div>
            )}
            {project.brandingDetails && (
              <div className="project-more-detail-row">
                <strong>Branding:</strong> {project.hasBranding && `${project.hasBranding} — `}
                {project.brandingDetails}
              </div>
            )}
            {project.specialRequirements && (
              <div className="project-more-detail-row">
                <strong>Special requirements:</strong> {project.specialRequirements}
              </div>
            )}
            {project.additionalComments && (
              <div className="project-more-detail-row">
                <strong>Comments:</strong> {project.additionalComments}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default ProjectOverview
