import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { DndContext, closestCenter, useSensors, useSensor, PointerSensor, KeyboardSensor } from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { projectAPI } from '../../../../../../services/api'
import SubStep from './SubStep'
import SortableSubStep from './SortableSubStep/SortableSubStep'
import ClientQuestion from './ClientQuestion'
import PhaseApprovalBadge from './PhaseApprovalBadge'
import WeekTimeline from './WeekTimeline'
import SubStepModal from '../../../../../../components/modal-components/SubStepModal/SubStepModal'
import { isPendingApproval } from '../../../../../../utils/phaseApprovalUtils'
import { Button, Alert, Avatar, AvatarImage, AvatarFallback } from '../../../../../../components/ui-components'
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
      const updatedSubSteps = [...(localPhase.subSteps || [])]
      const index = updatedSubSteps.findIndex(
        (s) => (s._id || s.id)?.toString() === subStepId?.toString()
      )

      if (index >= 0) {
        updatedSubSteps[index] = { ...updatedSubSteps[index], ...updates }
      } else {
        // New sub-step
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

  const handleSubStepsReorder = useCallback(
    async (activeId, overId) => {
      if (!canUpdateSubSteps || !overId || activeId === overId) return
      const subSteps = [...(localPhase.subSteps || [])].sort((a, b) => (a.order || 0) - (b.order ?? 0))
      const findIndex = (id) => {
        const str = String(id)
        return subSteps.findIndex(
          (s) => (s._id || s.id)?.toString() === str || `substep-${s.order ?? 0}` === str
        )
      }
      const activeIdx = findIndex(activeId)
      const overIdx = findIndex(overId)
      if (activeIdx < 0 || overIdx < 0 || activeIdx === overIdx) return
      const reordered = arrayMove(subSteps, activeIdx, overIdx)
      const withOrder = reordered.map((s, i) => ({ ...s, order: i + 1 }))
      try {
        setLoading(true)
        setError(null)
        const updated = await projectAPI.updatePhase(project._id || project.id, localPhase._id || localPhase.id, {
          subSteps: withOrder,
        })
        setLocalPhase(updated)
        if (onUpdate) onUpdate(updated)
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to reorder')
      } finally {
        setLoading(false)
      }
    },
    [canUpdateSubSteps, localPhase, project, onUpdate]
  )

  const handleApprove = async (approved) => {
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
        approved
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
  const needsApproval = isPendingApproval(localPhase)
  const canApprove = canAnswerQuestion

  const subSteps = localPhase.subSteps || []
  const sortedSubSteps = [...subSteps].sort((a, b) => (a.order || 0) - (b.order || 0))
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

  const subStepIds = sortedSubSteps.map((s) => s._id || s.id || `substep-${s.order ?? 0}`)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const handleDragEnd = (event) => {
    const { active, over } = event
    handleSubStepsReorder(active?.id, over?.id)
  }

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
                            <AvatarImage src={assignee.avatar} alt={assignee.name} />
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
                      className="btn btn-primary"
                      disabled={loading}
                      onClick={() => handleStatusChange('in_progress')}
                    >
                      Start Phase
                    </Button>
                  </li>
                )}
                {canCompletePhase && !needsApproval && (
                  <li>
                    <Button
                      type="button"
                      variant="primary"
                      className=""
                      disabled={loading}
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
                        className="btn dark:btn-primary-dark"
                        disabled={loading}
                        onClick={() => handleApprove(false)}
                      >
                        Request Changes
                      </Button>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <div className="phase-cycle-right">
            <div className="phase-substeps">
              {sortedSubSteps.length === 0 ? (
                <p className="empty-state">No tasks defined for this cycle.</p>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={subStepIds} strategy={verticalListSortingStrategy}>
                    {sortedSubSteps.map((subStep, index) => {
                      const stepStatus = subStep.status ?? (subStep.completed ? 'completed' : 'pending')
                      const cardVariant = `substep-card--${stepStatus.replace('_', '-')}`
                      return (
                        <SortableSubStep
                          key={subStep._id || subStep.id || index}
                          subStep={subStep}
                          cardVariant={cardVariant}
                          onOpen={() => setSelectedSubStep(subStep)}
                        >
                          {getAssignedUser(subStep) && (() => {
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
                                    <AvatarImage src={assignee.avatar} alt={assignee.name} />
                                    <AvatarFallback>
                                      {assignee.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{assignee.name}</span>
                                </Link>
                              </div>
                            )
                          })()}
                        </SortableSubStep>
                      )
                    })}
                  </SortableContext>
                </DndContext>
              )}
              {canUpdateSubSteps && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="btn btn-secondary btn-sm"
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
            <WeekTimeline phase={localPhase} project={project} phases={phases} vertical />
          </div>
        </div>

      <SubStepModal
        open={selectedSubStep != null}
        onClose={() => setSelectedSubStep(null)}
        subStep={selectedSubStep}
        phase={localPhase}
        canEdit={canUpdateSubSteps}
        canAnswerQuestion={canAnswerQuestion}
        onUpdate={async (updates) => {
          await handleSubStepUpdate(selectedSubStep?._id ?? selectedSubStep?.id ?? null, updates)
          setSelectedSubStep(null)
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
