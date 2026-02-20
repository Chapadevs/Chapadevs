import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../../../../context/AuthContext'
import { calculatePermissions } from '../../utils/projectUtils'
import { projectAPI } from '../../../../../services/api'
import PhaseDetail from './components/PhaseDetail'
import PhaseApprovalBadge from './components/PhaseApprovalBadge'
import { getPhasesPendingApproval } from '../../../../../utils/phaseApprovalUtils'
import { Button, Alert, Input, Card, Badge } from '../../../../../components/ui-components'
import ProjectInfoSection from '../../components/ProjectInfoSection/ProjectInfoSection'
import ProjectOverview from '../../components/ProjectOverview/ProjectOverview'
import './Workspace.css'

const Timeline = ({ project, previews = [], onPhaseUpdate, onTimelineConfirmed }) => {
  const { user } = useAuth()
  const [selectedPhase, setSelectedPhase] = useState(null)
  const phasesScrollRef = useRef(null)

  const permissions = project && user ? calculatePermissions(user, project) : null
  const isClientOwner = permissions?.isClientOwner ?? false
  const isAssignedProgrammer = permissions?.isAssignedProgrammer ?? false
  const canConfirmTimeline = permissions?.canConfirmTimeline ?? true

  const [userRequestedCreateSteps, setUserRequestedCreateSteps] = useState(false)
  const [proposal, setProposal] = useState([])
  const [proposalLoading, setProposalLoading] = useState(false)
  const [proposalError, setProposalError] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [editingProposal, setEditingProposal] = useState([])

  const projectId = project?._id || project?.id
  const hasNoPhases = !project?.phases || project.phases.length === 0
  const showReviewTimeline = hasNoPhases && canConfirmTimeline

  console.log('showReviewTimeline', showReviewTimeline)
  console.log('has no phases', hasNoPhases)
  console.log('can confirm timeline', canConfirmTimeline)
  console.log('user requested create steps', calculatePermissions(user, project))

  useEffect(() => {
    if (!showReviewTimeline || !userRequestedCreateSteps || !projectId) return
    let cancelled = false
    setProposalLoading(true)
    setProposalError(null)
    projectAPI
      .getPhaseProposal(projectId)
      .then((data) => {
        if (!cancelled) {
          setProposal(Array.isArray(data) ? data : [])
          setEditingProposal(Array.isArray(data) ? data.map((p) => ({ ...p })) : [])
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setProposalError(err.response?.data?.message || err.message || 'Failed to load proposal')
        }
      })
      .finally(() => {
        if (!cancelled) setProposalLoading(false)
      })
    return () => { cancelled = true }
  }, [showReviewTimeline, userRequestedCreateSteps, projectId])

  const handleProposalFieldChange = (index, field, value) => {
    setEditingProposal((prev) => {
      const next = prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
      if (field === 'order') {
        const num = parseInt(value, 10)
        if (!Number.isNaN(num)) next[index].order = num
      }
      return next
    })
  }

  const handleConfirmTimeline = async () => {
    if (!projectId || editingProposal.length === 0) return
    setConfirming(true)
    setProposalError(null)
    try {
      const payload = editingProposal.map((p) => ({
        title: p.title || '',
        description: p.description ?? null,
        order: typeof p.order === 'number' ? p.order : parseInt(p.order, 10) || 0,
        deliverables: Array.isArray(p.deliverables) ? p.deliverables : [],
        weeks: p.weeks != null ? p.weeks : null,
      }))
      await projectAPI.confirmPhases(projectId, payload)
      onTimelineConfirmed?.()
    } catch (err) {
      setProposalError(err.response?.data?.message || err.message || 'Failed to confirm timeline')
    } finally {
      setConfirming(false)
    }
  }

  if (hasNoPhases && !canConfirmTimeline) {
    return (
      <div className="timeline-empty">
        <p>No phases have been created for this project yet.</p>
        <p className="timeline-empty-hint">
          The assigned programmer will review and confirm the timeline from this Workspace.
        </p>
      </div>
    )
  }

  if (showReviewTimeline && !userRequestedCreateSteps) {
    return (
      <section className="project-section project-phases">
        <div className="timeline-empty timeline-create-steps-empty">
          <p>No timeline yet. Create the project steps when you&apos;re ready to plan the work and align with the client.</p>
          <Button
            type="button"
            variant="primary"
            onClick={() => setUserRequestedCreateSteps(true)}
            aria-label="Create project steps"
          >
            Create steps
          </Button>
        </div>
      </section>
    )
  }
  if (showReviewTimeline && userRequestedCreateSteps) {
    return (
      <section className="project-section project-phases">
        <h3 className="project-tab-panel-title">Review timeline</h3>
        <p className="timeline-proposal-intro">
          Review the proposed phases below. Edit title, description, or order as needed, then confirm to create the timeline.
        </p>
        {proposalLoading && <p className="timeline-proposal-loading">Loading proposal...</p>}
        {proposalError && <Alert variant="error">{proposalError}</Alert>}
        {!proposalLoading && editingProposal.length > 0 && (
          <>
            <ul className="timeline-proposal-list">
              {editingProposal.map((phase, index) => (
                <li key={index} className="timeline-proposal-item">
                  <label className="timeline-proposal-label">
                    <span>Order</span>
                    <Input
                      type="number"
                      min={1}
                      value={phase.order ?? index + 1}
                      onChange={(e) => handleProposalFieldChange(index, 'order', e.target.value)}
                    />
                  </label>
                  <label className="timeline-proposal-label">
                    <span>Title</span>
                    <Input
                      type="text"
                      value={phase.title || ''}
                      onChange={(e) => handleProposalFieldChange(index, 'title', e.target.value)}
                    />
                  </label>
                  <label className="timeline-proposal-label">
                    <span>Description</span>
                    <Input
                      type="text"
                      value={phase.description ?? ''}
                      onChange={(e) => handleProposalFieldChange(index, 'description', e.target.value)}
                    />
                  </label>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmTimeline}
              disabled={confirming}
            >
              {confirming ? 'Confirming...' : 'Confirm timeline'}
            </Button>
          </>
        )}
      </section>
    )
  }

  const phases = project.phases.sort((a, b) => (a.order || 0) - (b.order || 0))
  const completedCount = phases.filter((p) => p.status === 'completed').length
  const progressPercentage = (completedCount / phases.length) * 100
  const pendingApprovals = getPhasesPendingApproval(phases)
  const canAnswerQuestion = permissions?.canAnswerQuestion ?? false
  const showPendingApprovalsStrip = canAnswerQuestion && pendingApprovals.length > 0

  const scrollPhases = (direction) => {
    const el = phasesScrollRef.current
    if (!el) return
    const delta = el.clientWidth * 0.6
    el.scrollBy({ left: direction === 'next' ? delta : -delta, behavior: 'smooth' })
  }

  const handlePhaseClick = (phase) => {
    setSelectedPhase(phase)
  }

  const handlePhaseUpdate = (updatedPhase) => {
    if (onPhaseUpdate) {
      onPhaseUpdate(updatedPhase)
    }
    setSelectedPhase(null)
  }

  return (
    <>
      <ProjectInfoSection project={project} />
      <ProjectOverview project={project} />
      <section className="project-section project-phases">
        <h3 className="project-tab-panel-title">Development Progress</h3>

        {showPendingApprovalsStrip && (
          <div className="timeline-pending-approvals-strip">
            <span className="timeline-pending-approvals-label">
              {pendingApprovals.length} phase{pendingApprovals.length !== 1 ? 's' : ''} need your approval
            </span>
            <ul className="timeline-pending-approvals-list">
              {pendingApprovals.map((phase) => (
                <li key={phase._id || phase.id}>
                  <Button
                    type="button"
                    variant="ghost"
                    className="timeline-pending-approvals-link"
                    onClick={() => handlePhaseClick(phase)}
                  >
                    {phase.title || `Phase ${phase.order}`}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="project-phases-linear">
          <div className="project-phases-progress-bar">
            <div
              className="project-phases-progress-fill"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="project-phases-progress-label">
            {completedCount} of {phases.length} phases completed
          </div>
          <div className="project-phases-scroll-outer">
            <div
              ref={phasesScrollRef}
              className="project-phases-scroll"
              role="region"
              aria-label="Project phases"
            >
              <div
                className="project-phases-scroll-inner"
                style={{
                  '--phases-step-width': 90,
                  '--phases-count': phases.length,
                }}
              >
                <div
                  className="project-phases-track"
                  style={{ '--steps': phases.length }}
                >
                  <div className="project-phases-track-line" aria-hidden />
                  <div
                    className="project-phases-track-fill"
                    style={{
                      width:
                        completedCount === 0 || phases.length <= 1
                          ? '0%'
                          : `${((completedCount - 1) / (phases.length - 1)) * 100}%`,
                    }}
                    aria-hidden
                  />
                  {phases.map((phase, index) => {
                    const phaseId = phase._id || phase.id
                    const isCompleted = phase.status === 'completed'
                    const isInProgress = phase.status === 'in_progress'
                    const subStepsProgress =
                      phase.subSteps && phase.subSteps.length > 0
                        ? (phase.subSteps.filter((s) => s.completed).length /
                            phase.subSteps.length) *
                          100
                        : null

                    return (
                      <div
                        key={phaseId}
                        className={`project-phase-step project-phase-step-clickable ${
                          isCompleted
                            ? 'step-completed'
                            : isInProgress
                            ? 'step-in-progress'
                            : 'step-pending'
                        }`}
                        style={{ '--step-i': index }}
                        role="button"
                        tabIndex={0}
                        onClick={() => handlePhaseClick(phase)}
                        onKeyDown={(e) =>
                          e.key === 'Enter' && handlePhaseClick(phase)
                        }
                        aria-label={`View details: ${phase.title}`}
                      >
                        <div className="project-phase-step-node">
                          {isCompleted ? (
                            <span className="project-phase-step-icon" aria-hidden>
                              ✓
                            </span>
                          ) : (
                            <span className="project-phase-step-number">
                              {phase.order}
                            </span>
                          )}
                        </div>
                        {subStepsProgress !== null && (
                          <div
                            className="project-phase-step-progress"
                            style={{ width: `${subStepsProgress}%` }}
                          />
                        )}
                        <PhaseApprovalBadge
                          requiresApproval={phase.requiresClientApproval}
                          approved={phase.clientApproved}
                          variant="step"
                        />
                      </div>
                    )
                  })}
                </div>
                <div
                  className="project-phases-labels"
                  style={{ '--steps': phases.length }}
                >
                  {phases.map((phase, index) => {
                    const phaseId = phase._id || phase.id
                    const isCompleted = phase.status === 'completed'
                    const isInProgress = phase.status === 'in_progress'
                    const weekNumber = phase.order || index + 1

                    return (
                      <div
                        key={phaseId}
                        className={`project-phase-label-wrap project-phase-label-clickable ${
                          isCompleted
                            ? 'label-completed'
                            : isInProgress
                            ? 'label-active'
                            : ''
                        }`}
                        style={{ '--step-i': index }}
                        role="button"
                        tabIndex={0}
                        onClick={() => handlePhaseClick(phase)}
                        onKeyDown={(e) =>
                          e.key === 'Enter' && handlePhaseClick(phase)
                        }
                        aria-label={`View details: ${phase.title}`}
                      >
                        <span className="project-phase-label-title">
                          Week {weekNumber}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="project-phases-grid">
          {phases.map((phase, index) => {
            const phaseId = phase._id || phase.id
            const isCompleted = phase.status === 'completed'
            const isInProgress = phase.status === 'in_progress'
            const subSteps = phase.subSteps || []
            const completedSubSteps = subSteps.filter((s) => s.completed).length
            const subStepsProgress = subSteps.length > 0 ? Math.round((completedSubSteps / subSteps.length) * 100) : null
            const weekNumber = phase.order || index + 1
            const statusLabel = isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Pending'

            return (
              <Card
                key={phaseId}
                variant="accent"
                className={`project-phase-card phase-card-clickable px-4 py-4 flex flex-col cursor-pointer hover:shadow-lg transition-shadow duration-300 ${
                  isCompleted ? 'phase-card-completed' : isInProgress ? 'phase-card-in-progress' : 'phase-card-pending'
                }`}
                role="button"
                tabIndex={0}
                onClick={() => handlePhaseClick(phase)}
                onKeyDown={(e) => e.key === 'Enter' && handlePhaseClick(phase)}
                aria-label={`View details: ${phase.title}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-heading text-xs text-ink-muted uppercase tracking-wider">Week {weekNumber}</span>
                  <Badge variant={isCompleted ? 'completed' : isInProgress ? 'development' : 'default'}>
                    {statusLabel}
                  </Badge>
                </div>
                <h4 className="font-heading text-sm text-ink uppercase tracking-wide m-0 mb-2">{phase.title || `Phase ${weekNumber}`}</h4>
                {subSteps.length > 0 && (
                  <div className="mt-auto">
                    <div className="project-phase-card-progress-bar h-1.5 bg-surface-gray w-full mb-1">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${subStepsProgress}%` }}
                      />
                    </div>
                    <span className="text-xs text-ink-muted">
                      {completedSubSteps} of {subSteps.length} sub-steps
                    </span>
                  </div>
                )}
                {(phase.estimatedDurationDays || phase.actualDurationDays) && (
                  <div className="text-xs text-ink-muted mt-2">
                    {phase.actualDurationDays != null && (
                      <span>{phase.actualDurationDays} day{phase.actualDurationDays !== 1 ? 's' : ''} actual</span>
                    )}
                    {phase.estimatedDurationDays != null && (
                      <span>
                        {phase.actualDurationDays != null ? ' · ' : ''}
                        {phase.estimatedDurationDays} day{phase.estimatedDurationDays !== 1 ? 's' : ''} estimated
                      </span>
                    )}
                  </div>
                )}
                <PhaseApprovalBadge
                  requiresApproval={phase.requiresClientApproval}
                  approved={phase.clientApproved}
                  variant="card"
                />
              </Card>
            )
          })}
        </div>
      </section>

      {selectedPhase && permissions && (
        <PhaseDetail
          phase={selectedPhase}
          project={project}
          isClientOwner={isClientOwner}
          isAssignedProgrammer={isAssignedProgrammer}
          canChangePhaseStatus={permissions.canChangePhaseStatus}
          canUpdateSubSteps={permissions.canUpdateSubSteps}
          canAnswerQuestion={permissions.canAnswerQuestion}
          canSaveNotes={permissions.canSaveNotes}
          canUploadAttachments={permissions.canUploadAttachments}
          isProgrammerOrAdmin={permissions.isProgrammerOrAdmin}
          userId={user?._id || user?.id}
          onClose={() => setSelectedPhase(null)}
          onUpdate={handlePhaseUpdate}
        />
      )}
    </>
  )
}

export default Timeline
