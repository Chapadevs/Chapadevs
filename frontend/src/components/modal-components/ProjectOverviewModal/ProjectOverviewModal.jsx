import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../ui-components'
import './ProjectOverviewModal.css'

/**
 * Modal that displays basic project info and description.
 * Used when a programmer is not authorized to view full project details
 * but can see basic info and description (from assignment list or public API).
 */
function ProjectOverviewModal({ basicInfo = {}, onClose }) {
  const { title, description, status, projectType, timeline, priority, client } = basicInfo
  const navigate = useNavigate()

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const handleBackToAssignment = () => {
    onClose()
    navigate('/assignments')
  }

  return (
    <div
      className="project-overview-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-overview-modal-title"
      onClick={onClose}
    >
      <div
        className="project-overview-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="project-overview-modal-header">
          <h2 id="project-overview-modal-title" className="project-overview-modal-title">
            {title || 'Project Overview'}
          </h2>
          <Button
            type="button"
            variant="ghost"
            className="project-overview-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </Button>
        </div>
        <div className="project-overview-modal-body">
          <p className="project-overview-modal-notice">
            You are not authorized to access full project details. Here is the basic information:
          </p>
          <div className="project-overview-modal-basic-info">
            {status && (
              <div className="project-overview-modal-info-item">
                <strong>Status:</strong> {status}
              </div>
            )}
            {projectType && (
              <div className="project-overview-modal-info-item">
                <strong>Type:</strong> {projectType}
              </div>
            )}
            {client?.name && (
              <div className="project-overview-modal-info-item">
                <strong>Client:</strong> {client.name}
                {client.company && ` (${client.company})`}
              </div>
            )}
            {priority && (
              <div className="project-overview-modal-info-item">
                <strong>Priority:</strong> {priority}
              </div>
            )}
            {timeline && (
              <div className="project-overview-modal-info-item">
                <strong>Workspace:</strong> {timeline}
              </div>
            )}
          </div>
          <h3 className="project-overview-modal-section-title">Overview</h3>
          <div className="project-overview-modal-content">
            {description || 'No description available.'}
          </div>
        </div>
        <div className="project-overview-modal-footer">
          <Button
            type="button"
            variant="primary"
            onClick={handleBackToAssignment}
          >
            Back to Available Projects
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ProjectOverviewModal
