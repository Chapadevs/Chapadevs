import { useState, useMemo, useEffect, useRef } from 'react'
import { DndContext } from '@dnd-kit/core'
import SubStep from './SubStep'
import KanbanColumn from './KanbanColumn/KanbanColumn'
import PhaseApprovalBadge from './PhaseApprovalBadge'
import WeekTimeline from './WeekTimeline'
import SubStepModal from '../../../../../../components/modal-components/SubStepModal/SubStepModal'
import { isPhaseReadyForCompletion } from '../../../utils/userPermissionsUtils'
import { getSubStepStatus, getAssignedUser } from '../../../utils/workspaceUtils'
import AssigneeChip from './CycleDetail/AssigneeChip'
import { KANBAN_COLUMNS } from '../../../utils/workspaceConstants'
import { useCyclePhase } from '../hooks/useCyclePhase'
import { useCycleKanban } from '../hooks/useCycleKanban'
import { Button, Alert, HoverGuidance } from '../../../../../../components/ui-components'
import './CycleDetail.css'

const CycleDetail = ({
  phase,
  project,
  phases = [],
  isClientOwner,
  isAdmin = false,
  isAssignedProgrammer,
  canChangePhaseStatus,
  canUpdateSubSteps,
  canMoveSubStepToCompleted = false,
  canAnswerQuestion,
  canAddQuestion = false,
  canSaveNotes,
  canUploadAttachments,
  canEditRequiredAttachments = false,
  isProgrammerOrAdmin,
  userId,
  onClose,
  onUpdate,
  onCycleActionsReady,
  embedded = false,
}) => {
  const [selectedSubStep, setSelectedSubStep] = useState(null)

  const cyclePhase = useCyclePhase({
    phase,
    project,
    canChangePhaseStatus,
    canUpdateSubSteps,
    canMoveSubStepToCompleted,
    canAnswerQuestion,
    isProgrammerOrAdmin,
    onUpdate,
  })
  const {
    loading,
    error,
    setError,
    localPhase,
    setLocalPhase,
    handleStatusChange,
    handleSubStepUpdate,
    handleSubStepsReorder,
    handleSubStepStatusChange,
    handleResetPhase,
    handleUnlockCycle,
    handleApprove,
    handleQuestionAnswer,
    handleAddPhaseQuestion,
    sortedSubSteps,
  } = cyclePhase

  const kanban = useCycleKanban({
    sortedSubSteps,
    canUpdateSubSteps,
    canMoveSubStepToCompleted,
    phaseStatus: localPhase.status,
    handleSubStepsReorder,
    handleSubStepStatusChange,
  })
  const {
    sensors,
    kanbanCollisionDetection,
    handleKanbanDragStart,
    handleKanbanDragOver,
    handleKanbanDragEnd,
  } = kanban

  const subSteps = localPhase.subSteps || []

  const subStepsByStatus = useMemo(() => {
    const grouped = { pending: [], in_progress: [], client_approval: [], completed: [] }
    for (const s of sortedSubSteps) {
      const st = s?.status ?? (s?.completed ? 'completed' : 'pending')
      if (grouped[st]) grouped[st].push(s)
    }
    return grouped
  }, [sortedSubSteps])

  const isPhaseLocked = localPhase.status === 'not_started'
  const phaseIndex = phases.findIndex((p) => (p._id || p.id) === (localPhase._id || localPhase.id))
  const isFirstPhase = phaseIndex <= 0
  const previousPhase = phaseIndex > 0 ? phases[phaseIndex - 1] : null
  const isPreviousPhaseCompleted = !previousPhase || previousPhase.status === 'completed'
  const canStartPhase =
    isPhaseLocked && canChangePhaseStatus && (isFirstPhase || isPreviousPhaseCompleted)
  const canCompletePhase =
    localPhase.status === 'in_progress' && canChangePhaseStatus
  const canResetPhase =
    (localPhase.status === 'in_progress' || localPhase.status === 'completed') && canChangePhaseStatus

  const completedSubSteps = subSteps.filter((s) => s.completed || s.status === 'completed').length
  const allSubStepsCompleted = completedSubSteps === subSteps.length && subSteps.length > 0
  const needsClientApproval = allSubStepsCompleted && !localPhase.clientApproved

  const phaseId = localPhase._id || localPhase.id
  const handlersRef = useRef({ handleStatusChange, handleResetPhase })
  handlersRef.current = { handleStatusChange, handleResetPhase }
  useEffect(() => {
    onCycleActionsReady?.({
      phaseId,
      handleStartPhase: () => handlersRef.current.handleStatusChange('in_progress'),
      canStartPhase,
      handleResetPhase: () => handlersRef.current.handleResetPhase(),
      canResetPhase,
      loading,
    })
    return () => onCycleActionsReady?.(null)
  }, [onCycleActionsReady, phaseId, canStartPhase, canResetPhase, loading])
  const canApprove = canAnswerQuestion
  const phaseCompletionReadiness = isPhaseReadyForCompletion(localPhase)
  const markCompleteBlockedReason = canCompletePhase && !needsClientApproval && !phaseCompletionReadiness.ready
    ? phaseCompletionReadiness.reason
    : null

  const subStepsProgress = subSteps.length > 0 ? (completedSubSteps / subSteps.length) * 100 : null
  const hasClientApproval = sortedSubSteps.some((s) => getSubStepStatus(s) === 'client_approval')
  const hasInProgress = sortedSubSteps.some((s) => getSubStepStatus(s) === 'in_progress')
  const hasPending = sortedSubSteps.some((s) => getSubStepStatus(s) === 'pending')

  const currentStepDisplayStatus =
    localPhase.status === 'completed' || allSubStepsCompleted
      ? 'completed'
      : hasClientApproval
        ? 'client_approval'
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
      : currentStepDisplayStatus === 'client_approval'
        ? 'Client approval'
        : currentStepDisplayStatus === 'in_progress'
          ? 'In progress'
          : currentStepDisplayStatus === 'pending'
            ? 'Pending'
            : 'Not started'

    const currentSubStep =
    sortedSubSteps.find(s => getSubStepStatus(s) === 'in_progress') ||
    sortedSubSteps.find(s => getSubStepStatus(s) === 'client_approval') ||
    sortedSubSteps.find(s => getSubStepStatus(s) === 'pending') ||
    null

  const content = (
    <>
      {!embedded && (
        <div className="project-phase-modal-header">
          <div className="project-phase-modal-header-content">
            {onClose && (
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
          </div>
          {onClose && (
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
      )}

      {error && <Alert variant="error">{error}</Alert>}

      {localPhase.status === 'completed' && (
        <HoverGuidance content="This cycle is complete. Dates and tasks are locked. You can still answer questions below.">
          <div className="mb-4 py-2 px-3 border-l-4 border-l-primary/30 bg-primary/5 text-ink-muted text-sm font-body">
            Cycle complete
          </div>
        </HoverGuidance>
      )}

      <HoverGuidance
        content={
          isPhaseLocked
            ? canStartPhase
              ? 'Click Start Phase to begin work on this cycle.'
              : 'This phase has not started. You need to complete the previous phase first.'
            : null
        }
      >
        <div className={`project-phase-modal-body phase-cycle-two-column ${isPhaseLocked ? 'phase-cycle-locked' : ''}`}>
          {(subStepsProgress !== null || localPhase.description) && (
            <div className="phase-cycle-progress-and-description">
              {subStepsProgress !== null && (
                <div className="project-phase-modal-progress">
                  <span className="project-phase-modal-progress-label font-body text-[10px] text-center">
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
              {localPhase.description && (
                <p className="phase-overview-description phase-overview-description-full font-body text-ink-muted text-xs text-center">
                  {localPhase.description}
                </p>
              )}
            </div>
          )}
          <div className="phase-cycle-top">
            <div className="phase-cycle-current-step-info max-w-sm mx-auto">
              {localPhase.status !== 'completed' && (
                <div className="phase-overview-status">
                  <PhaseApprovalBadge
                    requiresApproval={allSubStepsCompleted}
                    approved={localPhase.clientApproved}
                    variant="modal"
                  />
                </div>
              )}

              {currentSubStep && (getSubStepStatus(currentSubStep) === 'pending' || getSubStepStatus(currentSubStep) === 'client_approval' || getSubStepStatus(currentSubStep) === 'in_progress') ? (
                <div className="phase-current-substep-card">
                  <SubStep
                    subStep={currentSubStep}
                    cardVariant={`substep-card--${getSubStepStatus(currentSubStep).replace('_', '-')}`}
                    onOpen={() => setSelectedSubStep(currentSubStep)}
                    compact
                    minimal
                  />
                </div>

              ) : localPhase.status === 'completed' ? (
                <p className="phase-cycle-no-in-progress">Cycle completed.</p>
              ) : allSubStepsCompleted && localPhase.clientApproved ? (
                <p className="phase-cycle-no-in-progress text-ink-muted">Client approved. Programmer can mark complete.</p>
              ) : allSubStepsCompleted ? (
                <p className="phase-cycle-no-in-progress text-ink-muted">All tasks done. Awaiting client approval.</p>
              ) : (
                <p className="phase-cycle-no-in-progress">No tasks yet. Add a task with the button on the right.</p>
              )}
            </div>
          </div>

          <div className="phase-cycle-below">
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
              {sortedSubSteps.length === 0 && !(canUpdateSubSteps && localPhase.status !== 'completed') ? (
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
                          getAssignedUser(subStep, project) && (
                            <AssigneeChip assignee={getAssignedUser(subStep, project)} />
                          )
                        }
                        getCanDragForCard={(subStep) =>
                          !isPhaseLocked &&
                          ((canUpdateSubSteps && localPhase.status !== 'completed') ||
                            (canMoveSubStepToCompleted &&
                              getSubStepStatus(subStep) === 'client_approval' &&
                              localPhase.status !== 'completed'))
                        }
                        onAddTask={(columnStatus) =>
                          setSelectedSubStep({
                            title: 'New sub-step',
                            completed: columnStatus === 'completed',
                            notes: '',
                            status: columnStatus,
                            order: (localPhase.subSteps?.length ?? 0) + 1,
                          })
                        }
                        showAddTask={!isPhaseLocked && canUpdateSubSteps && localPhase.status !== 'completed'}
                        renderHeaderAction={(columnStatus) => {
                          if (columnStatus !== 'completed') return null
                          if ((isClientOwner || isAdmin) && localPhase.status !== 'completed') {
                            if (localPhase.clientApproved) {
                              return (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  disabled={loading}
                                  onClick={() => handleApprove(false)}
                                  className="!py-1 !px-2 text-xs w-full"
                                  title="Unmark approval"
                                >
                                  Not approved
                                </Button>
                              )
                            }
                            const approveDisabled = loading || !allSubStepsCompleted
                            return (
                              <div className="flex flex-col gap-1">
                                <Button
                                  type="button"
                                  variant="primary"
                                  size="sm"
                                  disabled={approveDisabled}
                                  onClick={() => handleApprove(true)}
                                  className="!py-1 !px-2 text-xs w-full"
                                  title={!allSubStepsCompleted ? 'Move all tasks to completed first' : undefined}
                                >
                                  Approve Cycle
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  disabled={approveDisabled}
                                  onClick={() => {
                                    const feedback = window.prompt('Optional: Add feedback for the programmer')
                                    handleApprove(false, feedback?.trim() || null)
                                  }}
                                  className="!py-1 !px-2 text-xs w-full"
                                  title={!allSubStepsCompleted ? 'Move all tasks to completed first' : undefined}
                                >
                                  Request Changes
                                </Button>
                              </div>
                            )
                          }
                          if (!canCompletePhase || needsClientApproval) return null
                          if (markCompleteBlockedReason) {
                            return (
                              <HoverGuidance content={markCompleteBlockedReason}>
                                <Button
                                  type="button"
                                  variant="primary"
                                  size="sm"
                                  disabled={loading || !phaseCompletionReadiness.ready}
                                  onClick={() => handleStatusChange('completed')}
                                  className="!py-1 !px-2 text-xs w-full"
                                >
                                  Mark Complete
                                </Button>
                              </HoverGuidance>
                            )
                          }
                          return (
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              disabled={loading || !phaseCompletionReadiness.ready}
                              onClick={() => handleStatusChange('completed')}
                              className="!py-1 !px-2 text-xs w-full"
                            >
                              Mark Complete
                            </Button>
                          )
                        }}
                      />
                    ))}
                  </div>
                </DndContext>
              )}
            </div>
          </div>
          </div>
        </div>
      </HoverGuidance>

      <SubStepModal
        open={selectedSubStep != null}
        onClose={() => setSelectedSubStep(null)}
        subStep={selectedSubStep}
        phase={localPhase}
        project={project}
        canEdit={!isPhaseLocked && canUpdateSubSteps && localPhase.status !== 'completed'}
        canEditRequiredAttachments={!isPhaseLocked && canEditRequiredAttachments && localPhase.status !== 'completed'}
        canUploadAttachments={canUploadAttachments}
        canAnswerQuestion={canAnswerQuestion && !isPhaseLocked}
        canAddQuestion={canAddQuestion && !isPhaseLocked}
        userId={userId}
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
