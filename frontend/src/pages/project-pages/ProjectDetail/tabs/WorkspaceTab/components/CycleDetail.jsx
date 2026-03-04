import { useState, useMemo } from 'react'
import { DndContext } from '@dnd-kit/core'
import SubStep from './SubStep'
import KanbanColumn from './KanbanColumn/KanbanColumn'
import ClientQuestion from './ClientQuestion'
import PhaseApprovalBadge from './PhaseApprovalBadge'
import WeekTimeline from './WeekTimeline'
import SubStepModal from '../../../../../../components/modal-components/SubStepModal/SubStepModal'
import AttachmentManager from './AttachmentManager'
import { isPendingApproval } from '../../../../../../utils/phaseApprovalUtils'
import { isPhaseReadyForCompletion } from '../../../utils/userPermissionsUtils'
import { getSubStepStatus, getAssignedUser } from '../../../utils/workspaceUtils'
import AssigneeChip from './CycleDetail/AssigneeChip'
import { KANBAN_COLUMNS, TASK_STATUS_LABELS } from '../../../utils/workspaceConstants'
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
  const [newPhaseQuestionText, setNewPhaseQuestionText] = useState('')

  const cyclePhase = useCyclePhase({
    phase,
    project,
    canChangePhaseStatus,
    canUpdateSubSteps,
    canAnswerQuestion,
    isProgrammerOrAdmin,
    onUpdate,
  })
  const {
    loading,
    addingPhaseQuestion,
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

  const handleAddPhaseQuestionClick = () => {
    handleAddPhaseQuestion(newPhaseQuestionText, setNewPhaseQuestionText, userId)
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

  const stepsInProgress = sortedSubSteps.filter(
    (s) => getSubStepStatus(s) === 'in_progress' || getSubStepStatus(s) === 'waiting_client'
  )
  const stepsPending = sortedSubSteps.filter((s) => getSubStepStatus(s) === 'pending')
  const questions = localPhase.clientQuestions || []
  const phaseLevelQuestions = [...questions]
    .filter((q) => q.subStepOrder == null)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

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

            <div className="phase-cycle-questions p-4 border border-border bg-surface">
              <h3 className="phase-cycle-panel-title font-heading text-sm text-ink uppercase tracking-wide mb-2">
                Questions
              </h3>
              {phaseLevelQuestions.length > 0 ? (
                <div className="flex flex-col gap-2 mb-2">
                  {phaseLevelQuestions.map((q, idx) => (
                    <ClientQuestion
                      key={q._id || idx}
                      question={q}
                      canAnswer={canAnswerQuestion}
                      onAnswer={(answer) =>
                        handleQuestionAnswer(String(q._id ?? q.order), answer, null)
                      }
                    />
                  ))}
                </div>
              ) : (
                <p className="phase-cycle-questions-hint font-body text-sm text-ink-muted mb-2">
                  No phase-level questions yet.
                </p>
              )}
              {canAddQuestion && localPhase.status !== 'completed' && (
                <div className="flex gap-2 min-w-0 items-center">
                  <input
                    type="text"
                    value={newPhaseQuestionText}
                    onChange={(e) => setNewPhaseQuestionText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPhaseQuestionClick()}
                    placeholder="Add a question"
                    className="flex-1 min-w-0 py-1 px-2 text-sm border border-border rounded-none font-body"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAddPhaseQuestionClick}
                    disabled={!newPhaseQuestionText.trim() || addingPhaseQuestion}
                    className="shrink-0 !py-1 !px-2 text-xs"
                  >
                    {addingPhaseQuestion ? 'Adding...' : 'Add'}
                  </Button>
                </div>
              )}
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
                          getAssignedUser(subStep, project) && (
                            <AssigneeChip assignee={getAssignedUser(subStep, project)} />
                          )
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
        canEditRequiredAttachments={canEditRequiredAttachments && localPhase.status !== 'completed'}
        canUploadAttachments={canUploadAttachments}
        canAnswerQuestion={canAnswerQuestion}
        canAddQuestion={canAddQuestion}
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
