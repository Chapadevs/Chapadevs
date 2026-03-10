import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, Input, Button } from '../../../../../../../components/ui-components'

import { formatDateOnly } from '../../../../../../../utils/dateUtils'

const formatDate = (d) => (d ? formatDateOnly(d, null) : null)

/**
 * Editable, draggable sub-step card for the Workspace Review Timeline proposal.
 * Supports expand/collapse to view and edit todos.
 */
const ProposalSubStepCard = ({ id, subStep, onChange, subStepIndex, startDate, dueDate, estimatedDurationDays }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(subStep?.title ?? '')
  const [isExpanded, setIsExpanded] = useState(false)
  const [newTodoText, setNewTodoText] = useState('')
  const [editingTodoIndex, setEditingTodoIndex] = useState(null)
  const [editingTodoValue, setEditingTodoValue] = useState('')
  const inputRef = useRef(null)
  const todoInputRef = useRef(null)

  const todos = subStep?.todos || []

  useEffect(() => {
    setEditValue(subStep?.title ?? '')
  }, [subStep?.title])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  useEffect(() => {
    if (editingTodoIndex != null && todoInputRef.current) {
      todoInputRef.current.focus()
      todoInputRef.current.select()
    }
  }, [editingTodoIndex])

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleBlur = () => {
    setIsEditing(false)
    const trimmed = editValue.trim()
    if (trimmed !== (subStep?.title ?? '')) {
      onChange?.(subStepIndex, trimmed || 'Untitled sub-step')
    } else {
      setEditValue(subStep?.title ?? '')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      inputRef.current?.blur()
    }
    if (e.key === 'Escape') {
      setEditValue(subStep?.title ?? '')
      setIsEditing(false)
      inputRef.current?.blur()
    }
  }

  const handleAddTodo = () => {
    const text = newTodoText.trim()
    if (!text) return
    const next = [...todos, { text, completed: false, order: todos.length + 1 }]
    setNewTodoText('')
    onChange?.(subStepIndex, { todos: next.map((t, k) => ({ text: t.text, completed: t.completed ?? false, order: k + 1 })) })
  }

  const handleRemoveTodo = (index) => {
    setEditingTodoIndex(null)
    const next = todos.filter((_, i) => i !== index).map((t, i) => ({ ...t, order: i + 1 }))
    onChange?.(subStepIndex, { todos: next.map((t, k) => ({ text: t.text, completed: t.completed ?? false, order: k + 1 })) })
  }

  const handleStartEditTodo = (index) => {
    setEditingTodoIndex(index)
    setEditingTodoValue(todos[index]?.text ?? '')
  }

  const handleSaveTodoEdit = () => {
    if (editingTodoIndex == null) return
    const trimmed = editingTodoValue.trim()
    const next = todos.map((t, i) =>
      i === editingTodoIndex ? { ...t, text: trimmed || 'Untitled task' } : t
    )
    setEditingTodoIndex(null)
    setEditingTodoValue('')
    onChange?.(subStepIndex, { todos: next.map((t, k) => ({ text: t.text, completed: t.completed ?? false, order: k + 1 })) })
  }

  const handleCancelTodoEdit = () => {
    setEditingTodoIndex(null)
    setEditingTodoValue('')
  }

  const hasTodos = todos.length > 0

  return (
    <div ref={setNodeRef} style={style} className="mb-1.5 w-full max-w-2xl self-stretch">
      <Card
        className="p-3 border border-border bg-card text-card-foreground shadow cursor-default"
        onClick={() => !isEditing && setIsEditing(true)}
      >
        <div className="flex items-start gap-1.5">
          <div
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0 mt-0.5 cursor-grab active:cursor-grabbing text-ink-muted hover:text-ink p-0.5 -ml-0.5 rounded-none touch-none"
            aria-label="Drag to reorder"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="opacity-60">
              <circle cx="5" cy="4" r="1.5" />
              <circle cx="11" cy="4" r="1.5" />
              <circle cx="5" cy="8" r="1.5" />
              <circle cx="11" cy="8" r="1.5" />
              <circle cx="5" cy="12" r="1.5" />
              <circle cx="11" cy="12" r="1.5" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <Input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                wrapperClassName=""
                className="font-body text-xs py-1.5 px-2 min-h-0"
                aria-label="Edit sub-step title"
              />
            ) : (
              <span className="substep-card-title-text font-body text-xs block leading-tight">
                {subStep?.title || 'Untitled sub-step'}
              </span>
            )}
            {(startDate != null || dueDate != null || estimatedDurationDays != null) && (
              <div className="flex items-center gap-2 mt-1 font-body text-[10px] text-ink-muted">
                {startDate != null && formatDate(startDate) && (
                  <span>Start: {formatDate(startDate)}</span>
                )}
                {dueDate != null && formatDate(dueDate) && (
                  <span>Due: {formatDate(dueDate)}</span>
                )}
                {estimatedDurationDays != null && estimatedDurationDays > 0 && (
                  <span>~{estimatedDurationDays} day{estimatedDurationDays !== 1 ? 's' : ''}</span>
                )}
              </div>
            )}
            <div className="flex items-center justify-between gap-2 mt-1">
              <p className="text-ink-muted text-[10px] font-body">Click to edit</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsExpanded((prev) => !prev)
                }}
                className="flex items-center gap-1 text-xs font-body text-primary hover:underline"
                aria-expanded={isExpanded}
                aria-label={isExpanded ? 'Collapse tasks' : 'Expand to view and edit tasks'}
              >
                <span>{hasTodos ? `${todos.length} task${todos.length !== 1 ? 's' : ''}` : 'Tasks'}</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                >
                  <path d="M3 4.5L6 7.5L9 4.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {isExpanded && hasTodos && (
          <div
            className="mt-3 pt-3 border-t border-border w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="font-heading text-[10px] uppercase text-ink-muted block mb-2">Tasks</span>
            <ul className="list-none pl-0 font-body text-xs space-y-1.5 w-full">
              {todos.map((todo, index) => (
                <li key={index} className="grid grid-cols-[1fr_auto] gap-2 items-center w-full">
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
                      className="!py-1 !px-2 !text-xs !min-h-0 !border"
                      aria-label="Edit task"
                    />
                  ) : (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() => handleStartEditTodo(index)}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleStartEditTodo(index)}
                      className="block break-words text-left min-w-0 overflow-hidden cursor-text hover:bg-gray-100 py-1 px-0.5 -mx-0.5 rounded-none"
                      aria-label={`Edit task: ${todo.text || 'Untitled'}`}
                    >
                      {todo.text || 'Untitled task'}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveTodo(index)}
                    className="shrink-0 text-ink-muted hover:text-ink p-0.5 text-xs leading-none"
                    aria-label={`Remove task "${todo.text}"`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2 mt-1 min-w-0 items-center">
              <Input
                type="text"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                placeholder="Add a task"
                wrapperClassName="flex-1 min-w-0 gap-0"
                className="!py-1 !px-2 !text-xs !min-h-0 !border"
              />
              <Button type="button" variant="secondary" size="sm" onClick={handleAddTodo} disabled={!newTodoText.trim()} className="!py-1 !px-2 text-xs">
                Add
              </Button>
            </div>
          </div>
        )}

        {isExpanded && !hasTodos && (
          <div
            className="mt-3 pt-3 border-t border-border w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="font-heading text-[10px] uppercase text-ink-muted block mb-2">Tasks</span>
            <p className="text-ink-muted text-[10px] font-body mb-2">No tasks yet.</p>
            <div className="flex gap-2 mt-1 min-w-0 items-center">
              <Input
                type="text"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                placeholder="Add a task"
                wrapperClassName="flex-1 min-w-0 gap-0"
                className="!py-1 !px-2 !text-xs !min-h-0 !border"
              />
              <Button type="button" variant="secondary" size="sm" onClick={handleAddTodo} disabled={!newTodoText.trim()} className="!py-1 !px-2 text-xs">
                Add
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

export default ProposalSubStepCard
