import { useState, useEffect } from 'react'
import { projectAPI } from '../../../../../services/api'
import SubStep from './SubStep'
import ClientQuestion from './ClientQuestion'
import AttachmentManager from './AttachmentManager'
import PhaseApprovalBadge from './PhaseApprovalBadge'
import { isPendingApproval } from '../../../../../utils/phaseApprovalUtils'
import { Button, Alert, Textarea } from '../../../../../components/ui-components'
import './PhaseDetail.css'

const PhaseDetail = ({
  phase,
  project,
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
}) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [localPhase, setLocalPhase] = useState(phase)
  const [notes, setNotes] = useState(phase.notes || '')

  useEffect(() => {
    setLocalPhase(phase)
    setNotes(phase.notes || '')
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

  const handleQuestionAnswer = async (questionId, answer) => {
    try {
      setLoading(true)
      setError(null)
      const updated = await projectAPI.answerQuestion(
        project._id || project.id,
        localPhase._id || localPhase.id,
        questionId,
        answer
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

  const handleNotesSave = async () => {
    if (!canSaveNotes) {
      setError('Only the assigned programmer can save notes')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const updated = await projectAPI.updatePhase(project._id || project.id, localPhase._id || localPhase.id, {
        notes,
      })
      setLocalPhase(updated)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save notes')
    } finally {
      setLoading(false)
    }
  }

  const handleAttachmentUpdate = () => {
    // Reload phase data after attachment changes
    if (onUpdate) {
      onUpdate(localPhase)
    }
  }

  const canStartPhase =
    localPhase.status === 'not_started' && canChangePhaseStatus
  const canCompletePhase =
    localPhase.status === 'in_progress' && canChangePhaseStatus
  const needsApproval = isPendingApproval(localPhase)
  const canApprove = canAnswerQuestion

  const estimatedDays = localPhase.estimatedDurationDays
  const actualDays = localPhase.actualDurationDays
  const subSteps = localPhase.subSteps || []
  const completedSubSteps = subSteps.filter((s) => s.completed).length
  const subStepsProgress = subSteps.length > 0 ? (completedSubSteps / subSteps.length) * 100 : null

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
        <div className="project-phase-modal-header">
          <div className="project-phase-modal-header-content">
            <h2 id="phase-modal-title" className="project-phase-modal-title">
              {localPhase.title}
            </h2>
            {subStepsProgress !== null && (
              <div className="project-phase-modal-progress">
                <div className="project-phase-modal-progress-bar">
                  <div
                    className="project-phase-modal-progress-fill"
                    style={{ width: `${subStepsProgress}%` }}
                  />
                </div>
                <span className="project-phase-modal-progress-label">
                  {Math.round(subStepsProgress)}% complete
                </span>
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            className="project-phase-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </Button>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="project-phase-modal-tabs">
          <Button
            variant="ghost"
            className={`project-phase-modal-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </Button>
          {subSteps.length > 0 && (
            <Button
              variant="ghost"
              className={`project-phase-modal-tab ${activeTab === 'substeps' ? 'active' : ''}`}
              onClick={() => setActiveTab('substeps')}
            >
              Sub-steps ({completedSubSteps}/{subSteps.length})
            </Button>
          )}
          {localPhase.clientQuestions && localPhase.clientQuestions.length > 0 && (
            <Button
              variant="ghost"
              className={`project-phase-modal-tab ${activeTab === 'questions' ? 'active' : ''}`}
              onClick={() => setActiveTab('questions')}
            >
              Questions
              {localPhase.clientQuestions.filter((q) => q.required && !q.answer).length > 0 && (
                <span className="tab-badge">
                  {localPhase.clientQuestions.filter((q) => q.required && !q.answer).length}
                </span>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            className={`project-phase-modal-tab ${activeTab === 'attachments' ? 'active' : ''}`}
            onClick={() => setActiveTab('attachments')}
          >
            Attachments ({localPhase.attachments?.length || 0})
          </Button>
          {canSaveNotes && (
            <Button
              variant="ghost"
              className={`project-phase-modal-tab ${activeTab === 'notes' ? 'active' : ''}`}
              onClick={() => setActiveTab('notes')}
            >
              Notes
            </Button>
          )}
        </div>

        <div className="project-phase-modal-body">
          {activeTab === 'overview' && (
            <div className="phase-overview">
              <div className="phase-overview-status">
                <span
                  className={`project-phase-modal-status-badge status-${localPhase.status?.replace('_', '-')}`}
                >
                  {localPhase.status === 'not_started' && 'Not started'}
                  {localPhase.status === 'in_progress' && 'In progress'}
                  {localPhase.status === 'completed' && 'Completed'}
                </span>
                <PhaseApprovalBadge
                  requiresApproval={localPhase.requiresClientApproval}
                  approved={localPhase.clientApproved}
                  variant="modal"
                />
              </div>

              {localPhase.description && (
                <p className="phase-overview-description">{localPhase.description}</p>
              )}

              <div className="phase-overview-meta">
                {(estimatedDays || actualDays) && (
                  <div className="phase-meta-item">
                    <strong>Duration:</strong>
                    <span>
                      {actualDays ? (
                        <>
                          {actualDays} day{actualDays !== 1 ? 's' : ''} (actual)
                          {estimatedDays && ` / ${estimatedDays} day${estimatedDays !== 1 ? 's' : ''} (estimated)`}
                        </>
                      ) : estimatedDays ? (
                        `${estimatedDays} day${estimatedDays !== 1 ? 's' : ''} (estimated)`
                      ) : null}
                    </span>
                  </div>
                )}

                {localPhase.completedAt && (
                  <div className="phase-meta-item">
                    <strong>Completed:</strong>
                    <span>{new Date(localPhase.completedAt).toLocaleDateString()}</span>
                  </div>
                )}

                {localPhase.dueDate && (
                  <div className="phase-meta-item">
                    <strong>Due Date:</strong>
                    <span>{new Date(localPhase.dueDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {localPhase.deliverables && localPhase.deliverables.length > 0 && (
                <div className="phase-deliverables">
                  <strong>Deliverables:</strong>
                  <ul>
                    {localPhase.deliverables.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="phase-actions">
                {canStartPhase && (
                  <Button
                    type="button"
                    variant="primary"
                    className="btn btn-primary"
                    disabled={loading}
                    onClick={() => handleStatusChange('in_progress')}
                  >
                    Start Phase
                  </Button>
                )}

                {canCompletePhase && !needsApproval && (
                  <Button
                    type="button"
                    variant="primary"
                    className="btn btn-primary"
                    disabled={loading}
                    onClick={() => handleStatusChange('completed')}
                  >
                    Mark Complete
                  </Button>
                )}

                {canCompletePhase && needsApproval && (
                  <div className="phase-approval-notice">
                    <p>This phase requires client approval before it can be marked as complete.</p>
                  </div>
                )}

                {needsApproval && canApprove && (
                  <div className="phase-approval-actions">
                    <Button
                      type="button"
                      variant="primary"
                      className="btn btn-success"
                      disabled={loading}
                      onClick={() => handleApprove(true)}
                    >
                      Approve Phase
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="btn btn-secondary"
                      disabled={loading}
                      onClick={() => handleApprove(false)}
                    >
                      Request Changes
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'substeps' && (
            <div className="phase-substeps">
              {subSteps.length === 0 ? (
                <p className="empty-state">No sub-steps defined for this phase.</p>
              ) : (
                <div className="substeps-list">
                  {subSteps
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((subStep, index) => (
                      <SubStep
                        key={subStep._id || subStep.id || index}
                        subStep={subStep}
                        canEdit={canUpdateSubSteps}
                        onUpdate={(updates) =>
                          handleSubStepUpdate(subStep._id || subStep.id, updates)
                        }
                      />
                    ))}
                </div>
              )}
              {canUpdateSubSteps && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="btn btn-secondary btn-sm"
                  onClick={() =>
                    handleSubStepUpdate(null, {
                      title: 'New sub-step',
                      completed: false,
                      notes: '',
                    })
                  }
                >
                  + Add Sub-step
                </Button>
              )}
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="phase-questions">
              {localPhase.clientQuestions && localPhase.clientQuestions.length > 0 ? (
                <div className="questions-list">
                  {localPhase.clientQuestions
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((question, index) => (
                      <ClientQuestion
                        key={question._id || index}
                        question={question}
                        canAnswer={canAnswerQuestion}
                        onAnswer={(answer) =>
                          handleQuestionAnswer(question._id || question.order, answer)
                        }
                      />
                    ))}
                </div>
              ) : (
                <p className="empty-state">No questions for this phase.</p>
              )}
            </div>
          )}

          {activeTab === 'attachments' && (
            <AttachmentManager
              phase={localPhase}
              project={project}
              canUpload={canUploadAttachments}
              isProgrammerOrAdmin={isProgrammerOrAdmin}
              userId={userId}
              onUpdate={handleAttachmentUpdate}
            />
          )}

          {activeTab === 'notes' && (
            <div className="phase-notes">
              <Textarea
                className="notes-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this phase..."
                rows={8}
                disabled={!canSaveNotes}
              />
              {canSaveNotes && (
                <Button
                  type="button"
                  variant="primary"
                  className="btn btn-primary"
                  onClick={handleNotesSave}
                  disabled={loading}
                >
                  Save Notes
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PhaseDetail
