import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { DndContext, pointerWithin, rectIntersection, closestCorners, closestCenter, useSensors, useSensor, PointerSensor, KeyboardSensor } from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { projectAPI } from '../../../../../../services/api'
import SubStep from './SubStep'
import KanbanColumn from './KanbanColumn/KanbanColumn'
import ClientQuestion from './ClientQuestion'
import PhaseApprovalBadge from './PhaseApprovalBadge'
import WeekTimeline from './WeekTimeline'
import SubStepModal from '../../../../../../components/modal-components/SubStepModal/SubStepModal'
import AttachmentManager from './AttachmentManager'
import { isPendingApproval } from '../../../../../../utils/phaseApprovalUtils'
import { isPhaseReadyForCompletion } from '../../../utils/userPermissionsUtils'
import { Button, Alert, Avatar, AvatarImage, AvatarFallback } from '../../../../../../components/ui-components'
import { getAvatarUrl } from '../../../../../../utils/avatarUtils'
import './CycleDetail.css'

const CycleDetail = ({
  phase,
  project,
  phases = [],
  isClientOwner,
  isAssignedProgrammer,
  canChangePhaseStatus,
  canUpdateSubSteps,
  canAnswerQuestion,
  canSaveNotes,
  canUploadAttachments,
  isProgrammerOrAdmin,
  userId,
  onClose,
  onUpdate,
  embedded = false,
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [localPhase, setLocalPhase] = useState(phase)
  const [selectedSubStep, setSelectedSubStep] = useState(null)

  useEffect(() => {
    setLocalPhase(phase)
  }, [phase])

  const handleStatusChange = async (newStatus) => {
    if (!canChangePhaseStatus) {
      setError('Only the assigned programmer can change phase status')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const updated = await projectAPI.updatePhase(project._id || project.id, localPhase._id || localPhase.id, {
        status: newStatus,
      })
      setLocalPhase(updated)
      if (onUpdate) {
        onUpdate(updated)
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update phase')
    } finally {
      setLoading(false)
    }
  }

  const handleSubStepUpdate = async (subStepId, updates) => {
    if (!canUpdateSubSteps) {
      setError('Only the assigned programmer can update sub-steps')
      return
    }

    try {
      setLoading(true)
      setError(null)
      let updatedSubSteps = [...(localPhase.subSteps || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      const index = updatedSubSteps.findIndex(
        (s) => (s._id || s.id)?.toString() === subStepId?.toString()
      )

      if (index >= 0) {
        updatedSubSteps[index] = { ...updatedSubSteps[index], ...updates }
      } else {
        updatedSubSteps.push({
          ...updates,
          order: updatedSubSteps.length + 1,
        })
      }

      const updated = await projectAPI.updatePhase(project._id || project.id, localPhase._id || localPhase.id, {
        subSteps: updatedSubSteps,
      })
      setLocalPhase(updated)
      if (onUpdate) {
        onUpdate(updated)
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update sub-step')
    } finally {
      setLoading(false)
    }
  }

  const KANBAN_COLUMNS = [
    { status: 'pending', label: 'Pending' },
    { status: 'in_progress', label: 'In progress' },
    { status: 'waiting_client', label: 'Waiting on client' },
    { status: 'completed', label: 'Completed' },
  ]

  const subSteps = localPhase.subSteps || []
  const sortedSubSteps = [...subSteps].sort((a, b) => (a.order || 0) - (b.order || 0))

  const subStepsByStatus = useMemo(() => {
    const grouped = { pending: [], in_progress: [], waiting_client: [], completed: [] }
    for (const s of sortedSubSteps) {
      const st = s?.status ?? (s?.completed ? 'completed' : 'pending')
      if (grouped[st]) grouped[st].push(s)
    }
    return grouped
  }, [sortedSubSteps])

  const findSubStepIndex = useCallback(
    (id) => {
      const str = String(id)
      return sortedSubSteps.findIndex((s) => {
        const sid = (s._id ?? s.id)?.toString?.() ?? String(s._id ?? s.id)
        return sid === str || `substep-${s.order ?? 0}` === str
      })
    },
    [sortedSubSteps]
  )

  const handleSubStepsReorder = useCallback(
    async (activeId, overId) => {
      if (!canUpdateSubSteps || !overId || activeId === overId) return
      const subSteps = [...(localPhase.subSteps || [])].sort((a, b) => (a.order || 0) - (b.order ?? 0))
      const activeIdx = findSubStepIndex(activeId)
      const overIdx = findSubStepIndex(overId)
      if (activeIdx < 0 || overIdx < 0 || activeIdx === overIdx) return
      const reordered = arrayMove(subSteps, activeIdx, overIdx).map((s, i) => ({ ...s, order: i + 1 }))
      try {
        setLoading(true)
        setError(null)
        const updated = await projectAPI.updatePhase(project._id || project.id, localPhase._id || localPhase.id, {
          subSteps: reordered,
        })
        setLocalPhase(updated)
        if (onUpdate) onUpdate(updated)
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to reorder')
      } finally {
        setLoading(false)
      }
    },
    [canUpdateSubSteps, localPhase, project, onUpdate, findSubStepIndex]
  )

  const handleSubStepStatusChange = useCallback(
    async (subStepId, newStatus) => {
      console.log('[Kanban handleSubStepStatusChange]', { subStepId, newStatus })
      if (!canUpdateSubSteps) return
      const subSteps = [...(localPhase.subSteps || [])].sort((a, b) => (a.order || 0) - (b.order ?? 0))
      const idx = findSubStepIndex(subStepId)
      console.log('[Kanban handleSubStepStatusChange]', { idx, subStepId })
      if (idx < 0) return
      const step = subSteps[idx]
      const updatedStep = {
        ...step,
        status: newStatus,
        completed: newStatus === 'completed',
      }
      const updatedSubSteps = subSteps.map((s, i) => (i === idx ? updatedStep : s))
      const statusOrder = { pending: 0, in_progress: 1, waiting_client: 2, completed: 3 }
      const sorted = [...updatedSubSteps].sort((a, b) => {
        const sa = statusOrder[getSubStepStatus(a)] ?? 0
        const sb = statusOrder[getSubStepStatus(b)] ?? 0
        if (sa !== sb) return sa - sb
        return (a.order ?? 0) - (b.order ?? 0)
      })
      const withOrder = sorted.map((s, i) => ({ ...s, order: i + 1 }))
      try {
        setLoading(true)
        setError(null)
        console.log('[Kanban handleSubStepStatusChange]', { action: 'API call', subStepsCount: withOrder.length })
        const updated = await projectAPI.updatePhase(project._id || project.id, localPhase._id || localPhase.id, {
          subSteps: withOrder,
        })
        console.log('[Kanban handleSubStepStatusChange]', { action: 'API success', updated })
        setLocalPhase(updated)
        if (onUpdate) onUpdate(updated)
      } catch (err) {
        console.error('[Kanban handleSubStepStatusChange]', { action: 'API error', err: err?.message, err })
        setError(err.response?.data?.message || err.message || 'Failed to update status')
      } finally {
        setLoading(false)
      }
    },
    [canUpdateSubSteps, localPhase, project, onUpdate, findSubStepIndex]
  )

  const handleResetPhase = async () => {
    if (!canChangePhaseStatus) {
      setError('Only the assigned programmer can reset phases')
      return
    }
    if (!window.confirm('Reset this phase to Not Started? All sub-step progress will be cleared.')) return
    try {
      setLoading(true)
      setError(null)
      const updated = await projectAPI.updatePhase(project._id || project.id, localPhase._id || localPhase.id, {
        reset: true,
      })
      setLocalPhase(updated)
      if (onUpdate) onUpdate(updated)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to reset phase')
    } finally {
      setLoading(false)
    }
  }

  const handleUnlockCycle = async () => {
    if (!isProgrammerOrAdmin) return
    if (!window.confirm('Unlock this cycle to edit dates and tasks again?')) return
    try {
      setLoading(true)
      setError(null)
      const updated = await projectAPI.updatePhase(project._id || project.id, localPhase._id || localPhase.id, {
        unlock: true,
      })
      setLocalPhase(updated)
      if (onUpdate) onUpdate(updated)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to unlock cycle')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (approved, feedback = null) => {
    if (!canAnswerQuestion) {
      setError('Only the client can approve phases')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const updated = await projectAPI.approvePhase(
        project._id || project.id,
        localPhase._id || localPhase.id,
        approved,
        feedback
      )
      setLocalPhase(updated)
      if (onUpdate) {
        onUpdate(updated)
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to approve phase')
    } finally {
      setLoading(false)
    }
  }

  const handleQuestionAnswer = async (questionId, answer, subStepOrder = null) => {
    try {
      setLoading(true)
      setError(null)
      const updated = await projectAPI.answerQuestion(
        project._id || project.id,
        localPhase._id || localPhase.id,
        questionId,
        answer,
        subStepOrder
      )
      setLocalPhase(updated)
      if (onUpdate) {
        onUpdate(updated)
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save answer')
    } finally {
      setLoading(false)
    }
  }

  const canStartPhase =
    localPhase.status === 'not_started' && canChangePhaseStatus
  const canCompletePhase =
    localPhase.status === 'in_progress' && canChangePhaseStatus
  const canResetPhase =
    (localPhase.status === 'in_progress' || localPhase.status === 'completed') && canChangePhaseStatus
  const needsApproval = isPendingApproval(localPhase)
  const canApprove = canAnswerQuestion
  const phaseCompletionReadiness = isPhaseReadyForCompletion(localPhase)
  const markCompleteBlockedReason = canCompletePhase && !needsApproval && !phaseCompletionReadiness.ready
    ? phaseCompletionReadiness.reason
    : null

  const completedSubSteps = subSteps.filter((s) => s.completed || s.status === 'completed').length
  const subStepsProgress = subSteps.length > 0 ? (completedSubSteps / subSteps.length) * 100 : null

  const getSubStepStatus = (s) => s?.status ?? (s?.completed ? 'completed' : 'pending')
  const stepsInProgress = sortedSubSteps.filter(
    (s) => getSubStepStatus(s) === 'in_progress' || getSubStepStatus(s) === 'waiting_client'
  )
  const stepsPending = sortedSubSteps.filter((s) => getSubStepStatus(s) === 'pending')
  const questions = localPhase.clientQuestions || []

  const TASK_STATUS_LABELS = {
    pending: 'Pending',
    waiting_client: 'Waiting on client',
    in_progress: 'In progress',
    completed: 'Completed',
  }

  const allSubStepsCompleted = completedSubSteps === subSteps.length && subSteps.length > 0
  const hasWaitingClient = sortedSubSteps.some((s) => getSubStepStatus(s) === 'waiting_client')
  const hasInProgress = sortedSubSteps.some((s) => getSubStepStatus(s) === 'in_progress')
  const hasPending = sortedSubSteps.some((s) => getSubStepStatus(s) === 'pending')

  const currentStepDisplayStatus =
    localPhase.status === 'completed' || allSubStepsCompleted
      ? 'completed'
      : hasWaitingClient
        ? 'waiting_client'
        : hasInProgress
          ? 'in_progress'
          : hasPending
            ? 'pending'
            : localPhase.status === 'in_progress'
              ? 'in_progress'
              : 'not_started'

  const currentStepDisplayLabel =
    currentStepDisplayStatus === 'completed'
      ? 'Completed'
      : currentStepDisplayStatus === 'waiting_client'
        ? 'Waiting on client'
        : currentStepDisplayStatus === 'in_progress'
          ? 'In progress'
          : currentStepDisplayStatus === 'pending'
            ? 'Pending'
            : 'Not started'

    const currentSubStep =
    sortedSubSteps.find(s => getSubStepStatus(s) === 'in_progress') ||
    sortedSubSteps.find(s => getSubStepStatus(s) === 'waiting_client') ||
    sortedSubSteps.find(s => getSubStepStatus(s) === 'pending') ||
    null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const lastOverRef = useRef(null)

  const kanbanLog = useCallback((label, data) => {
    if (typeof console?.log === 'function') {
      console.log(`[Kanban ${label}]`, data)
    }
  }, [])

  const kanbanCollisionDetection = useCallback((args) => {
    const { droppableContainers, ...rest } = args
    const containers = Array.isArray(droppableContainers)
      ? droppableContainers
      : Array.from(droppableContainers?.values?.() ?? [])
    const columnContainers = containers.filter((c) =>
      String(c?.id ?? '').startsWith('column-')
    )
    const cardContainers = containers.filter(
      (c) => !String(c?.id ?? '').startsWith('column-')
    )

    if (columnContainers.length > 0) {
      const columnByPointer = pointerWithin({
        ...rest,
        droppableContainers: columnContainers,
      })
      if (columnByPointer.length > 0) {
        kanbanLog('collision', { source: 'columnByPointer', ids: columnByPointer.map((c) => c.id) })
        return columnByPointer
      }
      const columnByCenter = closestCenter({
        ...rest,
        droppableContainers: columnContainers,
      })
      if (columnByCenter.length > 0) {
        kanbanLog('collision', { source: 'columnByCenter', ids: columnByCenter.map((c) => c.id) })
        return columnByCenter
      }
    }

    const pointer = pointerWithin({
      ...rest,
      droppableContainers: cardContainers,
    })
    if (pointer.length > 0) {
      kanbanLog('collision', { source: 'cardPointer', ids: pointer.map((c) => c.id) })
      return pointer
    }
    const corners = closestCorners({
      ...rest,
      droppableContainers: cardContainers,
    })
    if (corners.length > 0) {
      kanbanLog('collision', { source: 'cardCorners', ids: corners.map((c) => c.id) })
      return corners
    }
    const rect = rectIntersection(args)
    if (rect.length > 0) kanbanLog('collision', { source: 'rectIntersection', ids: rect.map((c) => c.id) })
    return rect
  }, [kanbanLog])

  const handleKanbanDragStart = useCallback((event) => {
    lastOverRef.current = null
    kanbanLog('dragStart', { activeId: event.active?.id, activeStatus: event.active?.data?.status })
  }, [kanbanLog])

  const handleKanbanDragOver = useCallback((event) => {
    if (event.over) {
      lastOverRef.current = event.over
      kanbanLog('dragOver', { overId: event.over?.id })
    }
  }, [kanbanLog])

  const handleKanbanDragEnd = useCallback(
    (event) => {
      const { active, over } = event
      const effectiveOver = over ?? lastOverRef.current
      kanbanLog('dragEnd', {
        overId: over?.id,
        lastOverId: lastOverRef.current?.id,
        effectiveOverId: effectiveOver?.id,
        canUpdateSubSteps,
      })
      lastOverRef.current = null
      if (!effectiveOver) {
        kanbanLog('dragEnd', { skip: 'no effectiveOver' })
        return
      }
      if (!canUpdateSubSteps) {
        kanbanLog('dragEnd', { skip: '!canUpdateSubSteps' })
        return
      }
      if (localPhase.status === 'completed') {
        kanbanLog('dragEnd', { skip: 'phase completed - cycle locked' })
        return
      }
      const activeId = active?.id
      const overId = String(effectiveOver.id)
      if (activeId === overId) {
        kanbanLog('dragEnd', { skip: 'activeId === overId', activeId, overId })
        return
      }
      const activeStep = sortedSubSteps.find((s) => {
        const sid = (s._id ?? s.id)?.toString?.() ?? String(s._id ?? s.id)
        return sid === String(activeId) || `substep-${s.order ?? 0}` === String(activeId)
      })
      const activeStatus = activeStep ? getSubStepStatus(activeStep) : (active?.data?.current?.status ?? active?.data?.status ?? 'pending')
      if (overId.startsWith('column-')) {
        const targetStatus = overId.replace('column-', '')
        if (targetStatus !== activeStatus) {
          kanbanLog('dragEnd', { action: 'statusChange', activeId, targetStatus, from: activeStatus })
          handleSubStepStatusChange(activeId, targetStatus)
        } else {
          kanbanLog('dragEnd', { skip: 'same status (column)', targetStatus, activeStatus })
        }
      } else {
        const overStep = sortedSubSteps.find((s) => {
          const sid = (s._id ?? s.id)?.toString?.() ?? String(s._id ?? s.id)
          return sid === overId || `substep-${s.order ?? 0}` === overId
        })
        const overStatus = overStep ? getSubStepStatus(overStep) : null
        if (!overStatus) {
          kanbanLog('dragEnd', { skip: 'no overStep', overId })
          return
        }
        if (overStatus === activeStatus) {
          kanbanLog('dragEnd', { action: 'reorder', activeId, overId })
          handleSubStepsReorder(activeId, overId)
        } else {
          kanbanLog('dragEnd', { action: 'statusChange', activeId, overStatus, from: activeStatus })
          handleSubStepStatusChange(activeId, overStatus)
        }
      }
    },
    [
      canUpdateSubSteps,
      localPhase.status,
      sortedSubSteps,
      getSubStepStatus,
      handleSubStepsReorder,
      handleSubStepStatusChange,
      kanbanLog,
    ]
  )

    function getAssignedUser(step) {
      if (!step?.assignedTo) return null

      if (typeof step.assignedTo === 'object' && step.assignedTo !== null && step.assignedTo._id !== undefined)
        return step.assignedTo

      const id = step.assignedTo?.toString?.() || step.assignedTo
      if (!id) return null

      const main = project?.assignedProgrammerId
      if (main && typeof main === 'object' && (main._id?.toString() === id || main?.toString() === id))
        return main
      const list = project?.assignedProgrammerIds || []
      for (const p of list) {
        if (typeof p !== 'object') continue
        const pid = p._id?.toString?.() || p?.toString?.()
        if (pid === id) return p
      }
      return null
    } 
  const content = (
    <>
      <div className={embedded ? 'phase-detail-embedded-header' : 'project-phase-modal-header'}>
        <div className="project-phase-modal-header-content">
          {!embedded && onClose && (
            <Button
              type="button"
              variant="ghost"
              className="project-phase-modal-back"
              onClick={onClose}
              aria-label="Back to cycles"
            >
              ← Back to cycles
            </Button>
            )}
          <h2 id="phase-modal-title" className="project-phase-modal-title">
            Cycle {localPhase.order ?? 1}: {localPhase.title}
          </h2>
          {subStepsProgress !== null && (
            <div className="project-phase-modal-progress">
              <span className="project-phase-modal-progress-label"> 
                {Math.round(subStepsProgress)}% complete
              </span>
              <div className="project-phase-modal-progress-bar">
                <div
                  className="project-phase-modal-progress-fill"
                  style={{ width: `${subStepsProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
        {!embedded && onClose && (
          <Button
            type="button"
            variant="ghost"
            className="project-phase-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </Button>
        )}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {localPhase.status === 'completed' && (
        <Alert variant="info" className="mb-4">
          This cycle is complete. Dates and tasks are locked. You can still answer questions below.
        </Alert>
      )}

      <div className="project-phase-modal-body phase-cycle-two-column">
          <div className="phase-cycle-left">

            <div className="phase-cycle-current-step-info">
              <h3 className="phase-cycle-panel-title font-heading text-sm text-ink uppercase tracking-wide">
                Current step
              </h3>
              <div className="phase-overview-status">
                <PhaseApprovalBadge
                  requiresApproval={localPhase.requiresClientApproval}
                  approved={localPhase.clientApproved}
                  variant="modal"
                />
              </div>

              {currentSubStep && (getSubStepStatus(currentSubStep) === 'pending' || getSubStepStatus(currentSubStep) === 'waiting_client' || getSubStepStatus(currentSubStep) === 'in_progress') ? (
                <div className="phase-current-substep-card">

                  <SubStep
                    subStep={currentSubStep}
                    cardVariant={`substep-card--${getSubStepStatus(currentSubStep).replace('_', '-')}`}
                    onOpen={() => setSelectedSubStep(currentSubStep)}
                  >
                  
                  {getAssignedUser(currentSubStep) && (() => {
                    const assignee = getAssignedUser(currentSubStep)
                    const assigneeId = assignee._id ?? assignee.id
                    return (
                      <div className="phase-current-assignee">
                        <span className="phase-current-assignee-label">Assigned to:</span>
                        <Link
                          to={assigneeId ? `/users/${assigneeId}` : '#'}
                          className="phase-current-assignee-link"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`View ${assignee.name}'s profile`}
                        >
                          <Avatar className="assignee-avatar">
                            <AvatarImage src={getAvatarUrl(assignee.avatar)} alt={assignee.name} />
                            <AvatarFallback>
                              {assignee.name?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span>{assignee.name}</span>
                        </Link>
                      </div>
                    )
                  })()}
                  </SubStep>

                </div>

              ) : allSubStepsCompleted || localPhase.status === 'completed' ? (
                <p className="phase-cycle-no-in-progress">Cycle completed.</p>
              ) : (
                <p className="phase-cycle-no-in-progress">No tasks yet. Add a task with the button on the right.</p>
              )}
              {localPhase.description && (
                <p className="phase-overview-description">{localPhase.description}</p>
              )}
              <div className="phase-cycle-current-steps">
                <strong className="phase-cycle-current-steps-label">
                  {stepsInProgress.length > 0 ? 'Steps in progress' : 'Steps'}
                </strong>
                {stepsInProgress.length > 0 ? (
                  <ul className="phase-cycle-steps-list" aria-label="Steps being worked on">
                    {stepsInProgress.map((s, idx) => (
                      <li key={s._id || s.id || idx} className="phase-cycle-step-item">
                        <span className="phase-cycle-step-title">{s.title || 'Untitled'}</span>
                        <span className={`phase-cycle-step-status phase-cycle-step-status--${getSubStepStatus(s).replace('_', '-')}`}>
                          {TASK_STATUS_LABELS[getSubStepStatus(s)] || getSubStepStatus(s)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : stepsPending.length > 0 ? (
                  <p className="phase-cycle-no-in-progress">
                    No steps in progress. {stepsPending.length} pending — open a task card to start.
                  </p>
                ) : completedSubSteps === subSteps.length || localPhase.status === 'completed' ? (
                  <p className="phase-cycle-no-in-progress">Cycle completed.</p>
                ) : (
                  <p className="phase-cycle-no-in-progress">No tasks yet.</p>
                )}
              </div>
            </div>

            <div className="phase-cycle-actions">
              <h3 className="phase-cycle-panel-title font-heading text-sm text-ink uppercase tracking-wide">
                Cycle actions
              </h3>
              <ul className="phase-cycle-actions-list">
                {canStartPhase && (
                  <li>
                    <Button
                      type="button"
                      variant="primary"
                      disabled={loading}
                      onClick={() => handleStatusChange('in_progress')}
                    >
                      Start Phase
                    </Button>
                  </li>
                )}
                {canCompletePhase && !needsApproval && (
                  <li>
                    {markCompleteBlockedReason && (
                      <p className="text-amber-700 text-sm font-body mb-2">{markCompleteBlockedReason}</p>
                    )}
                    <Button
                      type="button"
                      variant="primary"
                      disabled={loading || !phaseCompletionReadiness.ready}
                      title={markCompleteBlockedReason || undefined}
                      onClick={() => handleStatusChange('completed')}
                    >
                      Mark Complete
                    </Button>
                  </li>
                )}
                {canCompletePhase && needsApproval && (
                  <li className="phase-approval-notice">
                    <p>Client approval required before marking complete.</p>
                  </li>
                )}
                {needsApproval && canApprove && (
                  <>
                    <li>
                      <Button
                        type="button"
                        variant="primary"
                        className="btn btn-success"
                        disabled={loading}
                        onClick={() => handleApprove(true)}
                      >
                        Approve Cycle
                      </Button>
                    </li>
                    <li>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={loading}
                        onClick={() => {
                          const feedback = window.prompt('Optional: Add feedback for the programmer')
                          handleApprove(false, feedback ?? null)
                        }}
                      >
                        Request Changes
                      </Button>
                    </li>
                  </>
                )}
                {canResetPhase && (
                  <li>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={loading}
                      onClick={handleResetPhase}
                    >
                      Reset Phase
                    </Button>
                  </li>
                )}
                {localPhase.status === 'completed' && isProgrammerOrAdmin && (
                  <li>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={loading}
                      onClick={handleUnlockCycle}
                    >
                      Unlock Cycle
                    </Button>
                  </li>
                )}
                {!canStartPhase && !canCompletePhase && !needsApproval && !canApprove && !canResetPhase && !(localPhase.status === 'completed' && isProgrammerOrAdmin) && (
                  <li>
                    <p className="text-ink-muted text-sm">No actions available for this cycle.</p>
                  </li>
                )}
              </ul>
            </div>

            <div className="phase-cycle-attachments">
              <h3 className="phase-cycle-panel-title font-heading text-sm text-ink uppercase tracking-wide">
                Attachments
              </h3>
              <AttachmentManager
                phase={localPhase}
                project={project}
                canUpload={canUploadAttachments}
                isProgrammerOrAdmin={isProgrammerOrAdmin}
                userId={userId}
                onUpdate={(updated) => {
                  setLocalPhase(updated)
                  onUpdate?.(updated)
                }}
              />
            </div>
          </div>

          <div className="phase-cycle-right">
            <div className="phase-cycle-timeline-wrapper">
              <WeekTimeline
                phase={localPhase}
                project={project}
                phases={phases}
                mode="gantt"
                onBarClick={setSelectedSubStep}
              />
            </div>
            <div className="phase-cycle-kanban-wrapper">
              {sortedSubSteps.length === 0 ? (
                <p className="empty-state">No tasks defined for this cycle.</p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={kanbanCollisionDetection}
                  onDragStart={handleKanbanDragStart}
                  onDragOver={handleKanbanDragOver}
                  onDragEnd={handleKanbanDragEnd}
                >
                  <div className="phase-cycle-kanban">
                    {KANBAN_COLUMNS.map((col) => (
                      <KanbanColumn
                        key={col.status}
                        status={col.status}
                        label={col.label}
                        cards={subStepsByStatus[col.status] || []}
                        onOpen={setSelectedSubStep}
                        renderCardChildren={(subStep) =>
                          getAssignedUser(subStep) && (() => {
                            const assignee = getAssignedUser(subStep)
                            const assigneeId = assignee._id ?? assignee.id
                            return (
                              <div className="phase-current-assignee">
                                <span className="phase-current-assignee-label">Assigned to:</span>
                                <Link
                                  to={assigneeId ? `/users/${assigneeId}` : '#'}
                                  className="phase-current-assignee-link"
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label={`View ${assignee.name}'s profile`}
                                >
                                  <Avatar className="assignee-avatar">
                                    <AvatarImage src={getAvatarUrl(assignee.avatar)} alt={assignee.name} />
                                    <AvatarFallback>
                                      {assignee.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{assignee.name}</span>
                                </Link>
                              </div>
                            )
                          })()
                        }
                      />
                    ))}
                  </div>
                </DndContext>
              )}
              {canUpdateSubSteps && localPhase.status !== 'completed' && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  onClick={() =>
                    setSelectedSubStep({
                      title: 'New sub-step',
                      completed: false,
                      notes: '',
                      status: 'pending',
                      order: (localPhase.subSteps?.length ?? 0) + 1,
                    })
                  }
                >
                  + Add task
                </Button>
              )}
            </div>
          </div>
        </div>

      <SubStepModal
        open={selectedSubStep != null}
        onClose={() => setSelectedSubStep(null)}
        subStep={selectedSubStep}
        phase={localPhase}
        project={project}
        canEdit={canUpdateSubSteps && localPhase.status !== 'completed'}
        canUploadAttachments={canUploadAttachments}
        canAnswerQuestion={canAnswerQuestion}
        onUpdate={async (updates) => {
          const isStatusOnly = Object.keys(updates).length <= 2 && 'status' in updates
          if (isStatusOnly) {
            await handleSubStepStatusChange(selectedSubStep?._id ?? selectedSubStep?.id ?? null, updates.status)
            setSelectedSubStep(null)
          } else {
            await handleSubStepUpdate(selectedSubStep?._id ?? selectedSubStep?.id ?? null, updates)
            setSelectedSubStep(null)
          }
        }}
        onPhaseUpdate={(updated) => {
          setLocalPhase(updated)
          onUpdate?.(updated)
        }}
        onQuestionAnswer={handleQuestionAnswer}
      />
    </>
  )

  if (embedded) {
    return (
      <div className="phase-detail-embedded" aria-labelledby="phase-modal-title">
        {content}
      </div>
    )
  }

  return (
    <div
      className="project-phase-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="phase-modal-title"
      onClick={onClose}
    >
      <div
        className="project-phase-modal project-phase-modal-enhanced"
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </div>
  )
}

export default CycleDetail
