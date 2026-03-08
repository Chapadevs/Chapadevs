import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Button, Input, Textarea, Avatar, AvatarImage, AvatarFallback, Alert, Badge } from '../../ui-components'
import ClientQuestion from '../../../pages/project-pages/ProjectDetail/tabs/WorkspaceTab/components/ClientQuestion'
import { projectAPI } from '../../../services/api'
import { getAvatarUrl } from '../../../utils/avatarUtils'
import { toDateInputValue, formatDateOnly } from '../../../utils/dateUtils'
import './SubStepModal.css'

const MS_PER_DAY = 24 * 60 * 60 * 1000

function getSubStepStartDate(source) {
  if (source?.startDate) return toDateInputValue(source.startDate)
  if (source?.dueDate && source?.estimatedDurationDays != null && source.estimatedDurationDays > 0) {
    const due = new Date(source.dueDate)
    const start = new Date(due.getTime() - source.estimatedDurationDays * MS_PER_DAY)
    return toDateInputValue(start)
  }
  return ''
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'client_approval', label: 'Waiting on client' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
]

/**
 * Modal content box for a task (sub-step): edit title, notes, status, mark complete,
 * and answer cycle questions. Cards open this modal for interaction.
 */
function getFileIcon(type) {
  if (!type) return '📄'
  if (type.includes('image')) return '🖼️'
  if (type.includes('pdf')) return '📕'
  if (type.includes('word') || type.includes('document')) return '📝'
  if (type.includes('zip') || type.includes('archive')) return '📦'
  return '📄'
}

const isGcsUrl = (url) => url && typeof url === 'string' && url.startsWith('https://storage.googleapis.com/')

function getFileUrl(url) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api'
  return `${backendUrl.replace('/api', '')}${url}`
}

function SubStepModal({
  open,
  onClose,
  subStep,
  phase,
  project,
  canEdit,
  canEditRequiredAttachments = false,
  canUploadAttachments = true,
  canAnswerQuestion,
  canAddQuestion = false,
  userId,
  onUpdate,
  onPhaseUpdate,
  onQuestionAnswer,
}) {
  const [title, setTitle] = useState(subStep?.title ?? '')
  const [notes, setNotes] = useState(subStep?.notes ?? '')
  const [status, setStatus] = useState(subStep?.status ?? (subStep?.completed ? 'completed' : 'pending'))
  const [completed, setCompleted] = useState(subStep?.completed ?? false)
  const [startDate, setStartDate] = useState(() => getSubStepStartDate(subStep))
  const [dueDate, setDueDate] = useState(() => toDateInputValue(subStep?.dueDate))
  const [todos, setTodos] = useState(() => (subStep?.todos || []).map((t) => ({ ...t, order: t.order ?? 0 })).sort((a, b) => a.order - b.order))
  const [newTodoText, setNewTodoText] = useState('')
  const [editingTodoIndex, setEditingTodoIndex] = useState(null)
  const [editingTodoValue, setEditingTodoValue] = useState('')
  const [editingRequired, setEditingRequired] = useState(false)
  const [editingRequiredIndex, setEditingRequiredIndex] = useState(null)
  const [newRequiredLabel, setNewRequiredLabel] = useState('')
  const [newRequiredDesc, setNewRequiredDesc] = useState('')
  const [newRequiredMinW, setNewRequiredMinW] = useState('')
  const [newRequiredMaxW, setNewRequiredMaxW] = useState('')
  const [newRequiredMinH, setNewRequiredMinH] = useState('')
  const [newRequiredMaxH, setNewRequiredMaxH] = useState('')
  const [newRequiredTypes, setNewRequiredTypes] = useState('')
  const [saving, setSaving] = useState(false)
  const [attachmentUploading, setAttachmentUploading] = useState(false)
  const [attachmentDeletingId, setAttachmentDeletingId] = useState(null)
  const [attachmentUpdatingStatusId, setAttachmentUpdatingStatusId] = useState(null)
  const [attachmentError, setAttachmentError] = useState(null)
  const [attachmentSignedUrls, setAttachmentSignedUrls] = useState({})
  const [saveValidationError, setSaveValidationError] = useState(null)
  const [newQuestionText, setNewQuestionText] = useState('')
  const [addingQuestion, setAddingQuestion] = useState(false)
  const todoInputRef = useRef(null)

  const subStepOrder = subStep?.order != null ? subStep.order : null
  const currentSubStep = phase?.subSteps?.find((s) => s.order === subStepOrder) || subStep
  const subStepAttachments = currentSubStep?.attachments || []
  const subStepId = currentSubStep?._id || currentSubStep?.id || subStepOrder

  useEffect(() => {
    const source = currentSubStep || subStep
    if (source) {
      setTitle(source.title ?? '')
      setNotes(source.notes ?? '')
      setStatus(source.status ?? (source.completed ? 'completed' : 'pending'))
      setCompleted(source.completed ?? false)
      setStartDate(getSubStepStartDate(source))
      setDueDate(toDateInputValue(source.dueDate))
      setTodos((source.todos || []).map((t) => ({ ...t, order: t.order ?? 0 })).sort((a, b) => a.order - b.order))
      setSaveValidationError(null)
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

  useEffect(() => {
    const gcsUrls = (subStepAttachments || [])
      .filter((a) => isGcsUrl(a.url) && a.type && String(a.type).includes('image'))
      .map((a) => a.url)
    if (gcsUrls.length === 0 || !project?._id || !phase?._id) return
    projectAPI
      .getAttachmentSignedUrls(project._id || project.id, phase._id || phase.id, gcsUrls)
      .then(({ urls }) => {
        const map = {}
        gcsUrls.forEach((orig, i) => {
          map[orig] = urls[i] || orig
        })
        setAttachmentSignedUrls(map)
      })
      .catch(() => {})
  }, [subStepAttachments, project?._id, phase?._id])

  const handleSave = async () => {
    setSaveValidationError(null)
    const isCompleted = currentSubStep?.status === 'completed' || currentSubStep?.completed === true
    const isClientApproval = status === 'client_approval'
    const startIso = startDate ? new Date(startDate).toISOString() : null
    const dueIso = dueDate ? new Date(dueDate).toISOString() : null
    if (!isCompleted && !isClientApproval && startIso && dueIso) {
      const start = new Date(startIso)
      const due = new Date(dueIso)
      if (due.getTime() < start.getTime()) {
        setSaveValidationError('Due date must be on or after start date.')
        return
      }
    }
    let estimatedDurationDays = currentSubStep?.estimatedDurationDays ?? null
    if (!isCompleted && !isClientApproval && startIso && dueIso) {
      const start = new Date(startIso)
      const due = new Date(dueIso)
      estimatedDurationDays = Math.max(1, Math.round((due.getTime() - start.getTime()) / MS_PER_DAY))
    }
    const datePayload = isCompleted
      ? {}
      : isClientApproval
        ? { dueDate: dueIso }
        : { startDate: startIso, dueDate: dueIso, estimatedDurationDays }
    const payload = {
      title,
      notes,
      status,
      completed: status === 'completed' || completed,
      order: subStep?.order,
      todos: todos.map((t, i) => ({ text: t.text, completed: t.completed ?? false, order: i + 1 })),
      ...datePayload,
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

  const handleAttachmentUpload = async (e, forRequiredIndex = null) => {
    const file = e.target.files?.[0]
    if (!file || !project || !phase || subStepId == null) return
    if (file.size > 10 * 1024 * 1024) {
      setAttachmentError('File size must be less than 10MB')
      return
    }
    try {
      setAttachmentUploading(true)
      setAttachmentError(null)
      const formData = new FormData()
      formData.append('file', file)
      if (Number.isInteger(forRequiredIndex) && forRequiredIndex >= 0) {
        formData.append('forRequiredIndex', String(forRequiredIndex))
      }
      const updated = await projectAPI.uploadSubStepAttachment(
        project._id || project.id,
        phase._id || phase.id,
        subStepId,
        formData
      )
      onPhaseUpdate?.(updated)
      e.target.value = ''
    } catch (err) {
      setAttachmentError(err.response?.data?.message || err.message || 'Failed to upload file')
    } finally {
      setAttachmentUploading(false)
    }
  }

  const handleAttachmentDelete = async (attachmentId) => {
    if (!window.confirm('Are you sure you want to delete this attachment?') || !project || !phase || subStepId == null) return
    try {
      setAttachmentDeletingId(attachmentId)
      setAttachmentError(null)
      const updated = await projectAPI.deleteSubStepAttachment(
        project._id || project.id,
        phase._id || phase.id,
        subStepId,
        attachmentId
      )
      onPhaseUpdate?.(updated)
    } catch (err) {
      setAttachmentError(err.response?.data?.message || err.message || 'Failed to delete attachment')
    } finally {
      setAttachmentDeletingId(null)
    }
  }

  const handleUpdateAttachmentStatus = async (attachmentId, status, changesNeededFeedback = null) => {
    if (!project || !phase || subStepId == null) return
    try {
      setAttachmentUpdatingStatusId(attachmentId)
      setAttachmentError(null)
      const updated = await projectAPI.updateSubStepAttachment(
        project._id || project.id,
        phase._id || phase.id,
        subStepId,
        attachmentId,
        { status, changesNeededFeedback }
      )
      onPhaseUpdate?.(updated)
    } catch (err) {
      setAttachmentError(err.response?.data?.message || err.message || 'Failed to update attachment status')
    } finally {
      setAttachmentUpdatingStatusId(null)
    }
  }

  const isImage = (type) => type && String(type).includes('image')
  const subStepRequiredAttachments = currentSubStep?.requiredAttachments || []

  const parseNum = (v) => {
    const n = parseInt(String(v).trim(), 10)
    return Number.isInteger(n) && n >= 0 ? n : null
  }
  const parseTypes = (v) =>
    String(v)
      .split(/[,;\s]+/)
      .map((t) => t.toLowerCase().trim())
      .filter(Boolean)

  const handleAddRequiredAttachment = async () => {
    const label = newRequiredLabel.trim()
    if (!label || !onUpdate) return
    setEditingRequiredIndex(null)
    const list = [...subStepRequiredAttachments]
    list.push({
      label,
      description: newRequiredDesc.trim() || '',
      order: list.length + 1,
      receivedAt: null,
      minWidth: parseNum(newRequiredMinW),
      maxWidth: parseNum(newRequiredMaxW),
      minHeight: parseNum(newRequiredMinH),
      maxHeight: parseNum(newRequiredMaxH),
      allowedTypes: parseTypes(newRequiredTypes),
    })
    try {
      await Promise.resolve(onUpdate({ requiredAttachments: list }))
      setNewRequiredLabel('')
      setNewRequiredDesc('')
      setNewRequiredMinW('')
      setNewRequiredMaxW('')
      setNewRequiredMinH('')
      setNewRequiredMaxH('')
      setNewRequiredTypes('')
      setEditingRequired(false)
    } catch (_) {}
  }

  const handleRemoveRequiredAttachment = async (index) => {
    if (!onUpdate) return
    const list = subStepRequiredAttachments.filter((_, i) => i !== index)
    try {
      await Promise.resolve(onUpdate({ requiredAttachments: list }))
      setEditingRequiredIndex(null)
    } catch (_) {}
  }

  const handleStartEditRequiredAttachment = (index) => {
    const ra = subStepRequiredAttachments[index]
    if (!ra) return
    setEditingRequired(false)
    setEditingRequiredIndex(index)
    setNewRequiredLabel(ra.label || '')
    setNewRequiredDesc(ra.description || '')
    setNewRequiredMinW(ra.minWidth != null ? String(ra.minWidth) : '')
    setNewRequiredMaxW(ra.maxWidth != null ? String(ra.maxWidth) : '')
    setNewRequiredMinH(ra.minHeight != null ? String(ra.minHeight) : '')
    setNewRequiredMaxH(ra.maxHeight != null ? String(ra.maxHeight) : '')
    setNewRequiredTypes((ra.allowedTypes || []).join(', '))
  }

  const handleCancelEditRequiredAttachment = () => {
    setEditingRequiredIndex(null)
    setEditingRequired(false)
    setNewRequiredLabel('')
    setNewRequiredDesc('')
    setNewRequiredMinW('')
    setNewRequiredMaxW('')
    setNewRequiredMinH('')
    setNewRequiredMaxH('')
    setNewRequiredTypes('')
  }

  const handleUpdateRequiredAttachment = async () => {
    const label = newRequiredLabel.trim()
    if (!label || !onUpdate || editingRequiredIndex == null) return
    const list = [...subStepRequiredAttachments]
    list[editingRequiredIndex] = {
      ...list[editingRequiredIndex],
      label,
      description: newRequiredDesc.trim() || '',
      minWidth: parseNum(newRequiredMinW),
      maxWidth: parseNum(newRequiredMaxW),
      minHeight: parseNum(newRequiredMinH),
      maxHeight: parseNum(newRequiredMaxH),
      allowedTypes: parseTypes(newRequiredTypes),
    }
    try {
      await Promise.resolve(onUpdate({ requiredAttachments: list }))
      handleCancelEditRequiredAttachment()
    } catch (_) {}
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
  const questionsForThisTask = canAnswerQuestion
    ? allQuestions.filter((q) => q.subStepOrder == null || q.subStepOrder === subStepOrder)
    : allQuestions
  const sortedQuestions = [...questionsForThisTask].sort((a, b) => (a.order || 0) - (b.order || 0))
  const isSubStepCompleted = currentSubStep?.status === 'completed' || currentSubStep?.completed === true
  const canEditDates = canEdit && !isSubStepCompleted

  const getQuestionWithEffectiveAnswer = (q) => ({
    ...q,
    answer: questionAnswersByOrder[q.order] !== undefined ? questionAnswersByOrder[q.order] : (q.answer || ''),
  })

  const handleAddQuestion = async () => {
    const text = newQuestionText?.trim()
    if (!text || !project || !phase || !onPhaseUpdate) return
    const existing = phase.clientQuestions || []
    const maxOrder = existing.length > 0 ? Math.max(...existing.map((q) => q.order ?? 0)) : 0
    const newQuestion = {
      question: text,
      required: false,
      order: maxOrder + 1,
      subStepOrder: subStepOrder ?? null,
      createdBy: userId,
    }
    try {
      setAddingQuestion(true)
      const updated = await projectAPI.updatePhase(
        project._id || project.id,
        phase._id || phase.id,
        { clientQuestions: [...existing, newQuestion] }
      )
      onPhaseUpdate(updated)
      setNewQuestionText('')
    } catch (_) {
      /* error handled by parent */
    } finally {
      setAddingQuestion(false)
    }
  }

  const phaseCompleted = phase?.status === 'completed'
  const showAddQuestion = canAddQuestion && !phaseCompleted

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
                    onChange={async (e) => {
                      const v = e.target.value
                      setStatus(v)
                      setCompleted(v === 'completed')
                      if (onUpdate) {
                        try {
                          await Promise.resolve(onUpdate({
                            status: v,
                            completed: v === 'completed',
                          }))
                        } catch (_) {}
                      }
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
                <div className="grid grid-cols-2 gap-2">
                  {canEditDates ? (
                    status === 'client_approval' ? (
                      <>
                        <label className="substep-modal-field">
                          <span className="substep-modal-label">Start date</span>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="substep-modal-select w-full rounded-none border border-border bg-surface px-3 py-2 font-body text-sm"
                          />
                        </label>
                        <label className="substep-modal-field">
                          <span className="substep-modal-label">Client approval due</span>
                          <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="substep-modal-select w-full rounded-none border border-border bg-surface px-3 py-2 font-body text-sm"
                          />
                        </label>
                      </>
                    ) : (
                      <>
                        <label className="substep-modal-field">
                          <span className="substep-modal-label">Start date</span>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="substep-modal-select w-full rounded-none border border-border bg-surface px-3 py-2 font-body text-sm"
                          />
                        </label>
                        <label className="substep-modal-field">
                          <span className="substep-modal-label">Due date</span>
                          <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="substep-modal-select w-full rounded-none border border-border bg-surface px-3 py-2 font-body text-sm"
                          />
                        </label>
                      </>
                    )
                  ) : (
                    <div className="col-span-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted font-body">
                      {status === 'client_approval' ? (
                        <>
                          {startDate && <span>Start: {formatDateOnly(startDate)}</span>}
                          {dueDate && <span>Approve by: {formatDateOnly(dueDate)}</span>}
                        </>
                      ) : (
                        <>
                          {startDate && <span>Start: {formatDateOnly(startDate)}</span>}
                          {dueDate && <span>Due: {formatDateOnly(dueDate)}</span>}
                          {isSubStepCompleted && currentSubStep?.completedAt && (
                            <span className="text-primary">Completed: {formatDateOnly(currentSubStep.completedAt)}</span>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="substep-modal-readonly">
                <p><strong>Title:</strong> {subStep?.title || '—'}</p>
                {subStep?.notes && <p><strong>Notes:</strong> {subStep.notes}</p>}
                <p><strong>Status:</strong> {STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status}</p>
                {(status === 'client_approval' ? (startDate || dueDate) : startDate || dueDate || (currentSubStep?.completedAt && (currentSubStep?.status === 'completed' || currentSubStep?.completed))) && (
                  <p className="mt-1 text-sm text-ink-muted font-body">
                    {status === 'client_approval' ? (
                      <>
                        {startDate && `Start: ${formatDateOnly(startDate)}`}
                        {startDate && dueDate && ' · '}
                        {dueDate && `Approve by: ${formatDateOnly(dueDate)}`}
                      </>
                    ) : (
                      <>
                        {startDate && `Start: ${formatDateOnly(startDate)}`}
                        {startDate && dueDate && ' · '}
                        {dueDate && `Due: ${formatDateOnly(dueDate)}`}
                        {currentSubStep?.completedAt && (currentSubStep?.status === 'completed' || currentSubStep?.completed) && (
                          <span className="text-primary"> · Completed: {formatDateOnly(currentSubStep.completedAt)}</span>
                        )}
                      </>
                    )}
                  </p>
                )}
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
                    <AvatarImage src={getAvatarUrl(assignedUser.avatar)} alt={assignedUser.name} />
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

          <section className="substep-modal-section">
            <h3 className="substep-modal-section-title">Questions for this task</h3>
            {sortedQuestions.length > 0 ? (
              <>
                <p className="substep-modal-section-hint">Answer these to specify progress for this task.</p>
                <div className="substep-modal-questions flex flex-col gap-2">
                  {sortedQuestions.map((question, index) => (
                    <ClientQuestion
                      key={question._id || index}
                      question={getQuestionWithEffectiveAnswer(question)}
                      canAnswer={canAnswerQuestion}
                      onAnswer={(answer) =>
                        onQuestionAnswer?.(
                          String(question._id ?? question.order),
                          answer,
                          question.subStepOrder != null ? subStepOrder : null
                        ) ?? Promise.resolve()
                      }
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="substep-modal-section-hint">No questions assigned to this task.</p>
            )}
            {showAddQuestion && (
              <div className="flex gap-2 mt-1 min-w-0 items-center">
                <Input
                  type="text"
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddQuestion()}
                  placeholder="Add a question"
                  wrapperClassName="flex-1 min-w-0 gap-0"
                  className="!py-1 !px-2 !text-sm !min-h-0 !border"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddQuestion}
                  disabled={!newQuestionText.trim() || addingQuestion}
                  className="!py-1 !px-2 text-xs"
                >
                  {addingQuestion ? 'Adding...' : 'Add'}
                </Button>
              </div>
            )}
          </section>

          {project && phase && (
            <section className="substep-modal-section">
              <h3 className="substep-modal-section-title font-heading">Attachments</h3>
              {attachmentError && <Alert variant="error" className="mb-2">{attachmentError}</Alert>}

              <div className="mb-3">
                <h4 className="font-heading text-xs uppercase tracking-wide text-ink mb-1.5">Required from client</h4>
                {subStepRequiredAttachments.length > 0 ? (
                  <ul className="list-none p-0 m-0 flex flex-col gap-1">
                    {subStepRequiredAttachments.map((ra, idx) => {
                      const hasConstraints =
                        ra.minWidth != null ||
                        ra.maxWidth != null ||
                        ra.minHeight != null ||
                        ra.maxHeight != null ||
                        (ra.allowedTypes?.length ?? 0) > 0
                      const constraintStr = hasConstraints
                        ? [
                            [ra.minWidth, ra.maxWidth].some((n) => n != null)
                              ? `${ra.minWidth ?? '?'}–${ra.maxWidth ?? '?'}px wide`
                              : null,
                            [ra.minHeight, ra.maxHeight].some((n) => n != null)
                              ? `${ra.minHeight ?? '?'}–${ra.maxHeight ?? '?'}px tall`
                              : null,
                            (ra.allowedTypes?.length ?? 0) > 0 ? (ra.allowedTypes || []).join(', ').toUpperCase() : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')
                        : null
                      const isEditing = editingRequiredIndex === idx
                      return (
                      <li key={idx} className="flex flex-col gap-2 p-2 border border-border bg-surface rounded-none">
                        {isEditing ? (
                          <div className="flex flex-col gap-2">
                            <Input
                              value={newRequiredLabel}
                              onChange={(e) => setNewRequiredLabel(e.target.value)}
                              placeholder="Label (e.g. Logo PNG/SVG)"
                              className="text-sm"
                            />
                            <Input
                              value={newRequiredDesc}
                              onChange={(e) => setNewRequiredDesc(e.target.value)}
                              placeholder="Description (optional)"
                              className="text-sm"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                type="number"
                                min={0}
                                value={newRequiredMinW}
                                onChange={(e) => setNewRequiredMinW(e.target.value)}
                                placeholder="Min width (px)"
                                className="text-sm"
                              />
                              <Input
                                type="number"
                                min={0}
                                value={newRequiredMaxW}
                                onChange={(e) => setNewRequiredMaxW(e.target.value)}
                                placeholder="Max width (px)"
                                className="text-sm"
                              />
                              <Input
                                type="number"
                                min={0}
                                value={newRequiredMinH}
                                onChange={(e) => setNewRequiredMinH(e.target.value)}
                                placeholder="Min height (px)"
                                className="text-sm"
                              />
                              <Input
                                type="number"
                                min={0}
                                value={newRequiredMaxH}
                                onChange={(e) => setNewRequiredMaxH(e.target.value)}
                                placeholder="Max height (px)"
                                className="text-sm"
                              />
                            </div>
                            <Input
                              value={newRequiredTypes}
                              onChange={(e) => setNewRequiredTypes(e.target.value)}
                              placeholder="Allowed types (e.g. png, jpeg)"
                              className="text-sm"
                            />
                            <div className="flex gap-2">
                              <Button type="button" variant="primary" size="sm" onClick={handleUpdateRequiredAttachment} disabled={!newRequiredLabel.trim()}>
                                Save
                              </Button>
                              <Button type="button" variant="secondary" size="sm" onClick={handleCancelEditRequiredAttachment}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <span className="font-body text-sm">{ra.label}</span>
                                {ra.description && (
                                  <span className="text-xs text-muted-foreground font-body block truncate" title={ra.description}>
                                    {ra.description}
                                  </span>
                                )}
                                {constraintStr && (
                                  <span className="text-xs text-muted-foreground font-body block" title={constraintStr}>
                                    {constraintStr}
                                  </span>
                                )}
                                {ra.receivedAt && (
                                  <span className="text-xs text-primary font-body">
                                    Received {new Date(ra.receivedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              <div className="shrink-0 flex items-center gap-1">
                                {canEditRequiredAttachments && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="px-2 py-1 text-xs text-ink-muted hover:text-ink shrink-0"
                                    onClick={() => handleStartEditRequiredAttachment(idx)}
                                  >
                                    Edit
                                  </Button>
                                )}
                                {canUploadAttachments && (
                                  <label className="inline-block cursor-pointer">
                                    <input
                                      type="file"
                                      accept={
                                        hasConstraints && (ra.allowedTypes?.length ?? 0) > 0
                                          ? (ra.allowedTypes || [])
                                              .map((t) => {
                                                const ext = String(t).toLowerCase()
                                                if (ext === 'png') return 'image/png'
                                                if (ext === 'jpeg' || ext === 'jpg') return 'image/jpeg'
                                                if (ext === 'svg') return 'image/svg+xml'
                                                if (ext === 'webp') return 'image/webp'
                                                if (ext === 'gif') return 'image/gif'
                                                return `image/${ext}`
                                              })
                                              .join(',')
                                          : 'image/*,.pdf,.doc,.docx'
                                      }
                                      onChange={(ev) => handleAttachmentUpload(ev, idx)}
                                      disabled={attachmentUploading}
                                      className="hidden"
                                    />
                                    <span className="inline-block px-3 py-1.5 text-xs font-button bg-primary text-white rounded-none hover:opacity-90 transition-opacity">
                                      {attachmentUploading ? 'Uploading...' : '+ Upload'}
                                    </span>
                                  </label>
                                )}
                                {canEditRequiredAttachments && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="px-2 py-1 text-xs text-ink-muted hover:text-ink shrink-0"
                                    onClick={() => handleRemoveRequiredAttachment(idx)}
                                  >
                                    Remove
                                  </Button>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </li>
                    )})}
                  </ul>
                ) : (
                  <p className="substep-modal-section-hint font-body text-sm text-ink-muted">No required attachments.</p>
                )}
                {subStepRequiredAttachments.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground font-body">Max 10MB per file</p>
                )}
                {canEditRequiredAttachments && (
                  editingRequired ? (
                    <div className="flex flex-col gap-2 mt-2 p-2 border border-border bg-surface rounded-none">
                      <Input
                        value={newRequiredLabel}
                        onChange={(e) => setNewRequiredLabel(e.target.value)}
                        placeholder="Label (e.g. Logo PNG/SVG)"
                        className="text-sm"
                      />
                      <Input
                        value={newRequiredDesc}
                        onChange={(e) => setNewRequiredDesc(e.target.value)}
                        placeholder="Description (optional)"
                        className="text-sm"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          min={0}
                          value={newRequiredMinW}
                          onChange={(e) => setNewRequiredMinW(e.target.value)}
                          placeholder="Min width (px)"
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          min={0}
                          value={newRequiredMaxW}
                          onChange={(e) => setNewRequiredMaxW(e.target.value)}
                          placeholder="Max width (px)"
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          min={0}
                          value={newRequiredMinH}
                          onChange={(e) => setNewRequiredMinH(e.target.value)}
                          placeholder="Min height (px)"
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          min={0}
                          value={newRequiredMaxH}
                          onChange={(e) => setNewRequiredMaxH(e.target.value)}
                          placeholder="Max height (px)"
                          className="text-sm"
                        />
                      </div>
                      <Input
                        value={newRequiredTypes}
                        onChange={(e) => setNewRequiredTypes(e.target.value)}
                        placeholder="Allowed types (e.g. png, jpeg)"
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button type="button" variant="primary" size="sm" onClick={handleAddRequiredAttachment} disabled={!newRequiredLabel.trim()}>
                          Add
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setEditingRequired(false)
                            setNewRequiredLabel('')
                            setNewRequiredDesc('')
                            setNewRequiredMinW('')
                            setNewRequiredMaxW('')
                            setNewRequiredMinH('')
                            setNewRequiredMaxH('')
                            setNewRequiredTypes('')
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => setEditingRequired(true)}>
                      + Add required attachment
                    </Button>
                  )
                )}
              </div>

              {canUploadAttachments && subStepRequiredAttachments.length === 0 && (
                <div className="mb-3">
                  <label className="inline-block cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleAttachmentUpload}
                      disabled={attachmentUploading}
                      className="hidden"
                    />
                    <span className="inline-block px-4 py-2 text-sm font-button bg-primary text-white rounded-none hover:opacity-90 transition-opacity">
                      {attachmentUploading ? 'Uploading...' : '+ Upload File'}
                    </span>
                  </label>
                  <p className="mt-1 text-xs text-muted-foreground font-body">Max 10MB</p>
                </div>
              )}
              {subStepAttachments.length === 0 ? (
                <p className="substep-modal-section-hint font-body text-sm text-ink-muted">No attachments yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {subStepAttachments.map((att) => {
                    const attId = att._id || att.id
                    const canDelete = canEdit
                    const fileUrl = getFileUrl(att.url)
                    const attIsImage = isImage(att.type)
                    const displayUrl = attIsImage && isGcsUrl(att.url)
                      ? (attachmentSignedUrls[att.url] || fileUrl)
                      : fileUrl
                    const status = att.status || 'ok'
                    const isChangesNeeded = status === 'changes_needed'
                    return (
                      <div key={attId} className="flex items-center gap-2 p-2 border border-border bg-surface rounded-none">
                        {attIsImage ? (
                          <a href={displayUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 block size-10 overflow-hidden rounded-none border border-border">
                            <img src={displayUrl} alt={att.filename} className="size-full object-cover" />
                          </a>
                        ) : (
                          <div className="shrink-0 flex size-10 items-center justify-center rounded-none border border-border bg-muted text-sm">
                            {getFileIcon(att.type)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-body text-sm truncate" title={att.filename}>{att.filename}</span>
                            {isChangesNeeded && (
                              <Badge variant="warning" className="shrink-0">Changes needed</Badge>
                            )}
                          </div>
                          {isChangesNeeded && att.changesNeededFeedback && (
                            <p className="text-xs text-amber-700 font-body mt-0.5" title={att.changesNeededFeedback}>
                              {att.changesNeededFeedback}
                            </p>
                          )}
                          {att.uploadedBy && (
                            <p className="text-xs text-muted-foreground font-body mt-0.5">
                              Uploaded by {typeof att.uploadedBy === 'object' && att.uploadedBy?.name
                                ? att.uploadedBy.name
                                : 'Unknown'}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 flex gap-1">
                          <a href={attIsImage && isGcsUrl(att.url) ? displayUrl : fileUrl} target="_blank" rel="noopener noreferrer" className="px-2 py-1 text-xs font-button text-primary hover:underline" download>Download</a>
                          {canEdit && (
                            <>
                              {isChangesNeeded ? (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="xs"
                                  className="!px-2 !py-0.5 !min-h-0"
                                  onClick={() => handleUpdateAttachmentStatus(attId, 'ok', null)}
                                  disabled={attachmentUpdatingStatusId === attId}
                                >
                                  {attachmentUpdatingStatusId === attId ? '...' : 'Mark OK'}
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="xs"
                                  className="!px-2 !py-0.5 !min-h-0"
                                  onClick={() => {
                                    const feedback = window.prompt('Optional: Add feedback for the client (e.g. "Logo needs higher resolution")')
                                    handleUpdateAttachmentStatus(attId, 'changes_needed', feedback?.trim() || null)
                                  }}
                                  disabled={attachmentUpdatingStatusId === attId}
                                >
                                  {attachmentUpdatingStatusId === attId ? '...' : 'Request changes'}
                                </Button>
                              )}
                            </>
                          )}
                          {canDelete && (
                            <Button type="button" variant="danger" size="xs" className="!px-2 !py-0.5 !min-h-0" onClick={() => handleAttachmentDelete(attId)} disabled={attachmentDeletingId === attId}>
                              {attachmentDeletingId === attId ? '...' : 'Delete'}
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )}
        </div>

        <div className="substep-modal-footer">
          {saveValidationError && (
            <p className="text-amber-700 text-sm font-body mb-2">{saveValidationError}</p>
          )}
          {canEdit && (
            <Button type="button" variant="secondary" className="" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save task'}
            </Button>
          )}
          <Button type="button" variant="secondary"  onClick={onClose} disabled={saving}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

export default SubStepModal
