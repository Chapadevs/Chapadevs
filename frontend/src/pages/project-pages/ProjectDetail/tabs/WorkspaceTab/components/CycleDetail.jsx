import { useState, useMemo } from 'react'
import { DndContext } from '@dnd-kit/core'
import SubStep from './SubStep'
import KanbanColumn from './KanbanColumn/KanbanColumn'
import PhaseApprovalBadge from './PhaseApprovalBadge'
import WeekTimeline from './WeekTimeline'
import SubStepModal from '../../../../../../components/modal-components/SubStepModal/SubStepModal'
import AttachmentManager from './AttachmentManager'
import { isPendingApproval } from '../../../../../../utils/phaseApprovalUtils'
import { isPhaseReadyForCompletion } from '../../../utils/userPermissionsUtils'
import { getSubStepStatus, getAssignedUser } from '../../../utils/workspaceUtils'
import AssigneeChip from './CycleDetail/AssigneeChip'
import { KANBAN_COLUMNS } from '../../../utils/workspaceConstants'
import { useCyclePhase } from '../hooks/useCyclePhase'
import { useCycleKanban } from '../hooks/useCycleKanban'
import { Button, Alert } from '../../../../../../components/ui-components'
import './CycleDetail.css'

const CycleDetail = ({
  phase,
  project,
  phases = [],
  isClientOwner,
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
    const grouped = { pending: [], in_progress: [], waiting_client: [], completed: [] }
    for (const s of sortedSubSteps) {
      const st = s?.status ?? (s?.completed ? 'completed' : 'pending')
      if (grouped[st]) grouped[st].push(s)
    }
    return grouped
  }, [sortedSubSteps])

  const isPhaseLocked = localPhase.status === 'not_started'
  const canStartPhase =
    isPhaseLocked && canChangePhaseStatus
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
        <Alert variant="info" className="mb-4">
          This cycle is complete. Dates and tasks are locked. You can still answer questions below.
        </Alert>
      )}

      {isPhaseLocked && (
        <Alert variant="info" className="mb-4">
          {canStartPhase
            ? 'This phase has not started yet. Start phase to begin work.'
            : 'This phase has not started yet.'}
        </Alert>
      )}

      <div className={`project-phase-modal-body phase-cycle-two-column ${isPhaseLocked ? 'phase-cycle-locked' : ''}`}>
          <div className="phase-cycle-top">
            <div className="phase-cycle-top-titles">
              <span className="phase-cycle-panel-title font-heading text-xs text-ink uppercase tracking-wide">Cycle actions</span>
              <span className="phase-cycle-panel-title font-heading text-xs text-ink uppercase tracking-wide">Attachments</span>
              <span className="phase-cycle-panel-title font-heading text-xs text-ink uppercase tracking-wide">Current step</span>
            </div>
            <div className="phase-cycle-top-panels">
            <div className="phase-cycle-actions">
              {subStepsProgress !== null && (
                <div className="project-phase-modal-progress">
                  <span className="project-phase-modal-progress-label font-body text-xs">
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
                <p className="phase-overview-description font-body text-ink-muted">{localPhase.description}</p>
              )}
              <ul className="phase-cycle-actions-list">
                {canStartPhase && (
                  <li>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
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
                      size="sm"
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
                        size="sm"
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
                        size="sm"
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
                      size="sm"
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
                      size="sm"
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
              <AttachmentManager
                phase={localPhase}
                project={project}
                canUpload={!isPhaseLocked && canUploadAttachments}
                isProgrammerOrAdmin={isProgrammerOrAdmin}
                userId={userId}
                compact
                onUpdate={(updated) => {
                  setLocalPhase(updated)
                  onUpdate?.(updated)
                }}
              />
            </div>

            <div className="phase-cycle-current-step-info">
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
                    compact
                  >
                  
                  {getAssignedUser(currentSubStep, project) && (
                    <AssigneeChip assignee={getAssignedUser(currentSubStep, project)} />
                  )}
                  </SubStep>

                </div>

              ) : allSubStepsCompleted || localPhase.status === 'completed' ? (
                <p className="phase-cycle-no-in-progress">Cycle completed.</p>
              ) : (
                <p className="phase-cycle-no-in-progress">No tasks yet. Add a task with the button on the right.</p>
              )}
            </div>
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
                              getSubStepStatus(subStep) === 'waiting_client' &&
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
                      />
                    ))}
                  </div>
                </DndContext>
              )}
            </div>
          </div>
          </div>
        </div>

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
