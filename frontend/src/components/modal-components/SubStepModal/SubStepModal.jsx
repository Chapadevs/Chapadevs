import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button, Input, Textarea, Avatar, AvatarImage, AvatarFallback } from '../../ui-components'
import ClientQuestion from '../../../pages/project-pages/ProjectDetail/tabs/WorkspaceTab/components/ClientQuestion'
import './SubStepModal.css'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'waiting_client', label: 'Waiting on client' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
]

/**
 * Modal content box for a task (sub-step): edit title, notes, status, mark complete,
 * and answer cycle questions. Cards open this modal for interaction.
 */
function SubStepModal({
  open,
  onClose,
  subStep,
  phase,
  canEdit,
  canAnswerQuestion,
  onUpdate,
  onQuestionAnswer,
}) {
  const [title, setTitle] = useState(subStep?.title ?? '')
  const [notes, setNotes] = useState(subStep?.notes ?? '')
  const [status, setStatus] = useState(subStep?.status ?? (subStep?.completed ? 'completed' : 'pending'))
  const [completed, setCompleted] = useState(subStep?.completed ?? false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (subStep) {
      setTitle(subStep.title ?? '')
      setNotes(subStep.notes ?? '')
      setStatus(subStep.status ?? (subStep.completed ? 'completed' : 'pending'))
      setCompleted(subStep.completed ?? false)
    }
  }, [subStep])

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const handleSave = async () => {
    const payload = {
      title,
      notes,
      status,
      completed: status === 'completed' || completed,
      order: subStep?.order,
    }
    try {
      setSaving(true)
      if (onUpdate) await Promise.resolve(onUpdate(payload))
      onClose()
    } catch (_) {
      /* keep modal open on error */
    } finally {
      setSaving(false)
    }
  }

  const subStepOrder = subStep?.order != null ? subStep.order : null
  const currentSubStep = phase?.subSteps?.find((s) => s.order === subStepOrder) || subStep
  const assignedUser =
    currentSubStep?.assignedTo &&
    typeof currentSubStep.assignedTo === 'object' &&
    currentSubStep.assignedTo._id != null
      ? currentSubStep.assignedTo
      : null
  const questionAnswersByOrder = (currentSubStep?.questionAnswers || []).reduce(
    (acc, qa) => ({ ...acc, [qa.order]: qa.answer }),
    {}
  )
  const allQuestions = phase?.clientQuestions || []
  const questionsForThisTask = allQuestions.filter(
    (q) => q.subStepOrder == null || q.subStepOrder === subStepOrder
  )
  const sortedQuestions = [...questionsForThisTask].sort((a, b) => (a.order || 0) - (b.order || 0))

  const getQuestionWithEffectiveAnswer = (q) => ({
    ...q,
    answer: questionAnswersByOrder[q.order] !== undefined ? questionAnswersByOrder[q.order] : (q.answer || ''),
  })

  if (!open) return null

  return (
    <div
      className="substep-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="substep-modal-title"
      onClick={onClose}
    >
      <div className="substep-modal" onClick={(e) => e.stopPropagation()}>
        <div className="substep-modal-header">
          <h2 id="substep-modal-title" className="substep-modal-title">
            {subStep?.title || 'Task'}
          </h2>
          <Button
            type="button"
            variant="ghost"
            className="substep-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </Button>
        </div>

        <div className="substep-modal-body">
          <section className="substep-modal-section">
            <h3 className="substep-modal-section-title">Task details</h3>
            {canEdit ? (
              <>
                <label className="substep-modal-field">
                  <span className="substep-modal-label">Title</span>
                  <Input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Task title"
                  />
                </label>
                <label className="substep-modal-field">
                  <span className="substep-modal-label">Notes</span>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes (optional)"
                    rows={3}
                  />
                </label>
                <label className="substep-modal-field">
                  <span className="substep-modal-label">Status</span>
                  <select
                    className="substep-modal-select"
                    value={status}
                    onChange={(e) => {
                      const v = e.target.value
                      setStatus(v)
                      setCompleted(v === 'completed')
                    }}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="substep-modal-checkbox-label">
                  <input
                    type="checkbox"
                    checked={completed}
                    onChange={(e) => {
                      setCompleted(e.target.checked)
                      setStatus(e.target.checked ? 'completed' : status === 'completed' ? 'pending' : status)
                    }}
                  />
                  <span>Mark as complete</span>
                </label>
              </>
            ) : (
              <div className="substep-modal-readonly">
                <p><strong>Title:</strong> {subStep?.title || '—'}</p>
                {subStep?.notes && <p><strong>Notes:</strong> {subStep.notes}</p>}
                <p><strong>Status:</strong> {STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status}</p>
              </div>
            )}
            {assignedUser && (
              <div className="substep-modal-assignee">
                <span className="substep-modal-assignee-label">Assigned to:</span>
                <Link
                  to={`/users/${assignedUser._id ?? assignedUser.id}`}
                  className="substep-modal-assignee-link"
                  aria-label={`View ${assignedUser.name}'s profile`}
                >
                  <Avatar className="substep-modal-assignee-avatar">
                    <AvatarImage src={assignedUser.avatar} alt={assignedUser.name} />
                    <AvatarFallback>
                      {assignedUser.name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span>{assignedUser.name}</span>
                </Link>
              </div>
            )}
          </section>

          {sortedQuestions.length > 0 ? (
            <section className="substep-modal-section">
              <h3 className="substep-modal-section-title">Questions for this task</h3>
              <p className="substep-modal-section-hint">Answer these to specify progress for this task.</p>
              <div className="substep-modal-questions">
                {sortedQuestions.map((question, index) => (
                  <ClientQuestion
                    key={question._id || index}
                    question={getQuestionWithEffectiveAnswer(question)}
                    canAnswer={canAnswerQuestion}
                    onAnswer={(answer) =>
                      onQuestionAnswer?.(String(question._id ?? question.order), answer, subStepOrder)
                    }
                  />
                ))}
              </div>
            </section>
          ) : (
            <section className="substep-modal-section">
              <h3 className="substep-modal-section-title">Questions for this task</h3>
              <p className="substep-modal-section-hint">No questions assigned to this task.</p>
            </section>
          )}
        </div>

        <div className="substep-modal-footer">
          {canEdit && (
            <Button type="button" variant="secondary" className="" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save task'}
            </Button>
          )}
          <Button type="button" variant="secondary" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

export default SubStepModal
