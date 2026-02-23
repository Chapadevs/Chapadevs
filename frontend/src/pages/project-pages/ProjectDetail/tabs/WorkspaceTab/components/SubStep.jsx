import { Card } from '../../../../../../components/ui-components'
import './SubStep.css'

const STATUS_LABELS = {
  pending: 'Pending',
  waiting_client: 'Waiting on client',
  in_progress: 'In progress',
  completed: 'Completed',
}

/**
 * Task card: content box summary. Click to open SubStepModal for full interaction.
 */
const SubStep = ({ subStep, cardVariant, onOpen, children }) => {

  const status = subStep.status ?? (subStep.completed ? 'completed' : 'pending')
  const cardClasses = cardVariant ? `substep-card phase-cycle-card-style ${cardVariant}` : 'substep-card phase-cycle-card-style'
  const notesPreview = subStep.notes ? (subStep.notes.slice(0, 80) + (subStep.notes.length > 80 ? '…' : '')) : null

  return (
    <Card
      variant="default"
      className={"p-5"}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen?.()
        }
      }}
      aria-label={`Open task: ${subStep.title || 'Untitled'}. Status: ${STATUS_LABELS[status] || status}`}
    >
      <div className="substep-card-title-row">
        <span className="substep-card-title-text">{subStep.title || 'Untitled sub-step'}</span>
      </div>
        <span className={`substep-status-badge substep-status-badge--${status.replace('_', '-')}`} aria-hidden>
          {STATUS_LABELS[status] || status}
        </span>
      <div className="substep-card-body">
        {notesPreview ? (
          <p className="substep-notes-preview">{notesPreview}</p>
        ) : (
          <p className="substep-notes-preview substep-notes-preview--hint">Click to open and edit</p>
        )}
      </div>
      {children}
    </Card>
  )
}

export default SubStep
