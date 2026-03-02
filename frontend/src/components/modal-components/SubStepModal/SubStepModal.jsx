import { useState, useEffect, useRef } from 'react'
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
  const [todos, setTodos] = useState(() => (subStep?.todos || []).map((t) => ({ ...t, order: t.order ?? 0 })).sort((a, b) => a.order - b.order))
  const [newTodoText, setNewTodoText] = useState('')
  const [editingTodoIndex, setEditingTodoIndex] = useState(null)
  const [editingTodoValue, setEditingTodoValue] = useState('')
  const [saving, setSaving] = useState(false)
  const todoInputRef = useRef(null)

  const subStepOrder = subStep?.order != null ? subStep.order : null
  const currentSubStep = phase?.subSteps?.find((s) => s.order === subStepOrder) || subStep

  useEffect(() => {
    const source = currentSubStep || subStep
    if (source) {
      setTitle(source.title ?? '')
      setNotes(source.notes ?? '')
      setStatus(source.status ?? (source.completed ? 'completed' : 'pending'))
      setCompleted(source.completed ?? false)
      setTodos((source.todos || []).map((t) => ({ ...t, order: t.order ?? 0 })).sort((a, b) => a.order - b.order))
    }
  }, [currentSubStep, subStep])

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
      todos: todos.map((t, i) => ({ text: t.text, completed: t.completed ?? false, order: i + 1 })),
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

  const handleTodoToggle = async (index) => {
    const next = todos.map((t, i) => (i === index ? { ...t, completed: !t.completed } : t))
    setTodos(next)
    if (onUpdate) {
      try {
        await Promise.resolve(onUpdate({ todos: next.map((t, i) => ({ text: t.text, completed: t.completed ?? false, order: i + 1 })) }))
      } catch (_) {}
    }
  }

  const handleAddTodo = async () => {
    const text = newTodoText.trim()
    if (!text) return
    const next = [...todos, { text, completed: false, order: todos.length + 1 }]
    setTodos(next)
    setNewTodoText('')
    if (onUpdate) {
      try {
        await Promise.resolve(onUpdate({ todos: next.map((t, i) => ({ text: t.text, completed: t.completed ?? false, order: i + 1 })) }))
      } catch (_) {}
    }
  }

  const handleRemoveTodo = async (index) => {
    setEditingTodoIndex(null)
    const next = todos.filter((_, i) => i !== index).map((t, i) => ({ ...t, order: i + 1 }))
    setTodos(next)
    if (onUpdate) {
      try {
        await Promise.resolve(onUpdate({ todos: next.map((t, i) => ({ text: t.text, completed: t.completed ?? false, order: i + 1 })) }))
      } catch (_) {}
    }
  }

  const handleStartEditTodo = (index) => {
    if (!canEdit) return
    setEditingTodoIndex(index)
    setEditingTodoValue(todos[index]?.text ?? '')
  }

  const handleSaveTodoEdit = async () => {
    if (editingTodoIndex == null) return
    const trimmed = editingTodoValue.trim()
    const next = todos.map((t, i) =>
      i === editingTodoIndex ? { ...t, text: trimmed || 'Untitled task' } : t
    )
    setEditingTodoIndex(null)
    setEditingTodoValue('')
    setTodos(next)
    if (onUpdate) {
      try {
        await Promise.resolve(onUpdate({ todos: next.map((t, i) => ({ text: t.text, completed: t.completed ?? false, order: i + 1 })) }))
      } catch (_) {}
    }
  }

  const handleCancelTodoEdit = () => {
    setEditingTodoIndex(null)
    setEditingTodoValue('')
  }

  useEffect(() => {
    if (editingTodoIndex != null && todoInputRef.current) {
      todoInputRef.current.focus()
      todoInputRef.current.select()
    }
  }, [editingTodoIndex])

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

          <section className="substep-modal-section w-full overflow-hidden">
            <h3 className="substep-modal-section-title font-heading">Tasks</h3>
            {todos.length > 0 ? (
              <ul className="list-none pl-0 font-body text-sm space-y-1.5 w-full">
                {todos.map((todo, index) => (
                  <li key={index} className="grid grid-cols-[auto_1fr_auto] gap-2 items-center w-full py-1.5">
                    <input
                      type="checkbox"
                      id={`substep-todo-${index}`}
                      checked={todo.completed ?? false}
                      onChange={canEdit ? () => handleTodoToggle(index) : undefined}
                      disabled={!canEdit}
                      className="rounded-none border-border w-4 h-4 shrink-0"
                      aria-label={`Mark "${todo.text}" as complete`}
                    />
                    {editingTodoIndex === index ? (
                      <Input
                        ref={todoInputRef}
                        type="text"
                        value={editingTodoValue}
                        onChange={(e) => setEditingTodoValue(e.target.value)}
                        onBlur={handleSaveTodoEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleSaveTodoEdit()
                          }
                          if (e.key === 'Escape') handleCancelTodoEdit()
                        }}
                        wrapperClassName="min-w-0 gap-0"
                        className="!py-1 !px-2 !text-sm !min-h-0 !border"
                        aria-label="Edit task"
                      />
                    ) : (
                      <div className="min-w-0 overflow-hidden">
                        {canEdit ? (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={() => handleStartEditTodo(index)}
                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleStartEditTodo(index)}
                            className={`block break-words text-left cursor-pointer hover:bg-gray-100 py-1 px-0.5 -mx-0.5 rounded-none ${todo.completed ? 'line-through text-ink-muted' : ''}`}
                            aria-label={`Edit task: ${todo.text || 'Untitled'}`}
                          >
                            {todo.text || 'Untitled task'}
                          </span>
                        ) : (
                          <span className={`block break-words text-left ${todo.completed ? 'line-through text-ink-muted' : ''}`}>
                            {todo.text || 'Untitled task'}
                          </span>
                        )}
                      </div>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTodo(index)}
                        className="shrink-0 text-ink-muted hover:text-ink p-0.5 text-xs leading-none"
                        aria-label={`Remove task "${todo.text}"`}
                      >
                        ×
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="substep-modal-section-hint font-body text-sm text-ink-muted">No tasks yet.</p>
            )}
            {canEdit && (
              <div className="flex gap-2 mt-1 min-w-0 items-center">
                <Input
                  type="text"
                  value={newTodoText}
                  onChange={(e) => setNewTodoText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                  placeholder="Add a task"
                  wrapperClassName="flex-1 min-w-0 gap-0"
                  className="!py-1 !px-2 !text-sm !min-h-0 !border"
                />
                <Button type="button" variant="secondary" size="sm" onClick={handleAddTodo} disabled={!newTodoText.trim()} className="!py-1 !px-2 text-xs">
                  Add
                </Button>
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
