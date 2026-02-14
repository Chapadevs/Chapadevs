import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../../../components/ui-components'
import './ProjectDescriptionModal.css'

/**
 * Modal that displays basic project info and description.
 * Used when a programmer is not authorized to view full project details
 * but can see basic info and description (from assignment list or public API).
 */
function ProjectDescriptionModal({ basicInfo = {}, onClose }) {
  const { title, description, status, projectType, budget, timeline, priority, client } = basicInfo
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
      className="project-description-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-description-modal-title"
      onClick={onClose}
    >
      <div
        className="project-description-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="project-description-modal-header">
          <h2 id="project-description-modal-title" className="project-description-modal-title">
            {title || 'Project Description'}
          </h2>
          <Button
            type="button"
            variant="ghost"
            className="project-description-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </Button>
        </div>
        <div className="project-description-modal-body">
          <p className="project-description-modal-notice">
            You are not authorized to access full project details. Here is the basic information:
          </p>
          <div className="project-description-modal-basic-info">
            {status && (
              <div className="project-description-modal-info-item">
                <strong>Status:</strong> {status}
              </div>
            )}
            {projectType && (
              <div className="project-description-modal-info-item">
                <strong>Type:</strong> {projectType}
              </div>
            )}
            {client?.name && (
              <div className="project-description-modal-info-item">
                <strong>Client:</strong> {client.name}
                {client.company && ` (${client.company})`}
              </div>
            )}
            {priority && (
              <div className="project-description-modal-info-item">
                <strong>Priority:</strong> {priority}
              </div>
            )}
            {budget && (
              <div className="project-description-modal-info-item">
                <strong>Budget:</strong> {budget}
              </div>
            )}
            {timeline && (
              <div className="project-description-modal-info-item">
                <strong>Timeline:</strong> {timeline}
              </div>
            )}
          </div>
          <h3 className="project-description-modal-section-title">Description</h3>
          <div className="project-description-modal-content">
            {description || 'No description available.'}
          </div>
        </div>
        <div className="project-description-modal-footer">
          <Button
            type="button"
            variant="primary"
            className="btn btn-primary"
            onClick={handleBackToAssignment}
          >
            Back to Available Projects
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ProjectDescriptionModal
