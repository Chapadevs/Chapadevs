import { Paperclip } from 'lucide-react'
import { Card } from '../../../../../../components/ui-components'
import './SubStep.css'

const STATUS_LABELS = {
  pending: 'Pending',
  client_approval: 'Client approval',
  in_progress: 'In progress',
  completed: 'Completed',
}

import { formatDateOnly } from '../../../../../../utils/dateUtils'

const formatDate = (d) => (d ? formatDateOnly(d, null) : null)

/**
 * Task card: content box summary. Click to open SubStepModal for full interaction.
 */
const SubStep = ({ subStep, cardVariant, onOpen, children, compact = false, minimal = false }) => {
  const status = subStep.status ?? (subStep.completed ? 'completed' : 'pending')
  const cardClasses = cardVariant ? `substep-card phase-cycle-card-style ${cardVariant}` : 'substep-card phase-cycle-card-style'
  const notesPreview = subStep.notes ? (subStep.notes.slice(0, 80) + (subStep.notes.length > 80 ? '…' : '')) : null
  const hasDueInfo =
    subStep.startDate != null ||
    subStep.dueDate != null ||
    (subStep.estimatedDurationDays != null && subStep.estimatedDurationDays > 0)
  const startDate = subStep.startDate
    ? new Date(subStep.startDate)
    : subStep.dueDate && subStep.estimatedDurationDays != null && subStep.estimatedDurationDays > 0
      ? new Date(new Date(subStep.dueDate).getTime() - subStep.estimatedDurationDays * 24 * 60 * 60 * 1000)
      : null
  const todosList = subStep.todos || []
  const completedTodos = todosList.filter((t) => t.completed).length
  const hasTodos = todosList.length > 0
  const attachmentsCount = (subStep.attachments || []).length

  return (
    <Card
      variant="default"
      className={compact ? 'p-2' : 'p-5'}
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
      {!minimal && (
        <>
          <div className="substep-card-body">
            {notesPreview ? (
              <p className={`substep-notes-preview ${compact ? 'text-[0.65rem]' : ''}`}>{notesPreview}</p>
            ) : (
              <p className={`substep-notes-preview substep-notes-preview--hint ${compact ? 'text-[0.65rem]' : ''}`}>Click to open and edit</p>
            )}
            {hasDueInfo && (
              <div className={`flex items-center gap-2 font-body text-ink-muted ${compact ? 'mt-0.5 text-[0.65rem]' : 'mt-1.5 text-xs'}`}>
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
              <div className={`flex items-center gap-2 font-body text-ink-muted ${compact ? 'mt-0.5 text-[0.65rem]' : 'mt-1.5 text-xs'}`}>
                <span>{completedTodos}/{todosList.length} tasks</span>
              </div>
            )}
            {attachmentsCount > 0 && (
              <div className={`flex items-center gap-1.5 font-body text-ink-muted ${compact ? 'mt-0.5 text-[0.65rem]' : 'mt-1.5 text-xs'}`}>
                <Paperclip className="size-3.5 shrink-0" aria-hidden />
                <span>{attachmentsCount} attachment{attachmentsCount !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
          {children}
        </>
      )}
    </Card>
  )
}

export default SubStep
