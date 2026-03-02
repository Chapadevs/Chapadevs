import { Card } from '../../../../../../components/ui-components'
import './SubStep.css'

const STATUS_LABELS = {
  pending: 'Pending',
  waiting_client: 'Waiting on client',
  in_progress: 'In progress',
  completed: 'Completed',
}

import { formatDateOnly } from '../../../../../../utils/dateUtils'

const formatDate = (d) => (d ? formatDateOnly(d, null) : null)

/**
 * Task card: content box summary. Click to open SubStepModal for full interaction.
 */
const SubStep = ({ subStep, cardVariant, onOpen, children }) => {
  const status = subStep.status ?? (subStep.completed ? 'completed' : 'pending')
  const cardClasses = cardVariant ? `substep-card phase-cycle-card-style ${cardVariant}` : 'substep-card phase-cycle-card-style'
  const notesPreview = subStep.notes ? (subStep.notes.slice(0, 80) + (subStep.notes.length > 80 ? '…' : '')) : null
  const hasDueInfo = subStep.dueDate != null || (subStep.estimatedDurationDays != null && subStep.estimatedDurationDays > 0)
  const startDate =
    subStep.dueDate && subStep.estimatedDurationDays != null && subStep.estimatedDurationDays > 0
      ? new Date(new Date(subStep.dueDate).getTime() - subStep.estimatedDurationDays * 24 * 60 * 60 * 1000)
      : null
  const todosList = subStep.todos || []
  const completedTodos = todosList.filter((t) => t.completed).length
  const hasTodos = todosList.length > 0

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
        {hasDueInfo && (
          <div className="flex items-center gap-2 mt-1.5 font-body text-xs text-ink-muted">
            {startDate != null && formatDate(startDate) && (
              <span>Start: {formatDate(startDate)}</span>
            )}
            {subStep.dueDate != null && formatDate(subStep.dueDate) && (
              <span>Due: {formatDate(subStep.dueDate)}</span>
            )}
            {subStep.estimatedDurationDays != null && subStep.estimatedDurationDays > 0 && (
              <span>~{subStep.estimatedDurationDays} day{subStep.estimatedDurationDays !== 1 ? 's' : ''}</span>
            )}
          </div>
        )}
        {hasTodos && (
          <div className="flex items-center gap-2 mt-1.5 font-body text-xs text-ink-muted">
            <span>{completedTodos}/{todosList.length} tasks</span>
          </div>
        )}
      </div>
      {children}
    </Card>
  )
}

export default SubStep
