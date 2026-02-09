import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { calculatePermissions } from '../../../pages/project-pages/ProjectDetail/utils/projectUtils'
import { projectAPI } from '../../../services/api'
import PhaseDetail from './PhaseDetail'
import './Timeline.css'

const Timeline = ({ project, previews = [], onPhaseUpdate, onTimelineConfirmed }) => {
  const { user } = useAuth()
  const [selectedPhase, setSelectedPhase] = useState(null)
  const phasesScrollRef = useRef(null)

  const permissions = project && user ? calculatePermissions(user, project) : null
  const isClientOwner = permissions?.isClientOwner ?? false
  const isAssignedProgrammer = permissions?.isAssignedProgrammer ?? false
  const canConfirmTimeline = permissions?.isProgrammerOrAdmin ?? false

  const [proposal, setProposal] = useState([])
  const [proposalLoading, setProposalLoading] = useState(false)
  const [proposalError, setProposalError] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [editingProposal, setEditingProposal] = useState([])

  const projectId = project?._id || project?.id
  const hasNoPhases = !project?.phases || project.phases.length === 0
  const showReviewTimeline = hasNoPhases && canConfirmTimeline

  useEffect(() => {
    if (!showReviewTimeline || !projectId) return
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
  }, [showReviewTimeline, projectId])

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

  if (showReviewTimeline) {
    return (
      <section className="project-section project-phases">
        <h3 className="project-tab-panel-title">Review timeline</h3>
        <p className="timeline-proposal-intro">
          Review the proposed phases below. Edit title, description, or order as needed, then confirm to create the timeline.
        </p>
        {proposalLoading && <p className="timeline-proposal-loading">Loading proposal...</p>}
        {proposalError && <div className="error-message">{proposalError}</div>}
        {!proposalLoading && editingProposal.length > 0 && (
          <>
            <ul className="timeline-proposal-list">
              {editingProposal.map((phase, index) => (
                <li key={index} className="timeline-proposal-item">
                  <label className="timeline-proposal-label">
                    <span>Order</span>
                    <input
                      type="number"
                      min={1}
                      value={phase.order ?? index + 1}
                      onChange={(e) => handleProposalFieldChange(index, 'order', e.target.value)}
                    />
                  </label>
                  <label className="timeline-proposal-label">
                    <span>Title</span>
                    <input
                      type="text"
                      value={phase.title || ''}
                      onChange={(e) => handleProposalFieldChange(index, 'title', e.target.value)}
                    />
                  </label>
                  <label className="timeline-proposal-label">
                    <span>Description</span>
                    <input
                      type="text"
                      value={phase.description ?? ''}
                      onChange={(e) => handleProposalFieldChange(index, 'description', e.target.value)}
                    />
                  </label>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirmTimeline}
              disabled={confirming}
            >
              {confirming ? 'Confirming...' : 'Confirm timeline'}
            </button>
          </>
        )}
      </section>
    )
  }

  const phases = project.phases.sort((a, b) => (a.order || 0) - (b.order || 0))
  const completedCount = phases.filter((p) => p.status === 'completed').length
  const progressPercentage = (completedCount / phases.length) * 100

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
      <section className="project-section project-phases">
        <h3 className="project-tab-panel-title">Development Progress</h3>

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
                    const isLocked = index > 0 && phases.slice(0, index).some((p) => p.status !== 'completed')
                    const subStepsProgress =
                      phase.subSteps && phase.subSteps.length > 0
                        ? (phase.subSteps.filter((s) => s.completed).length /
                            phase.subSteps.length) *
                          100
                        : null

                    return (
                      <div
                        key={phaseId}
                        className={`project-phase-step ${isLocked ? 'step-locked' : 'project-phase-step-clickable'} ${
                          isCompleted
                            ? 'step-completed'
                            : isInProgress
                            ? 'step-in-progress'
                            : 'step-pending'
                        }`}
                        style={{ '--step-i': index }}
                        role={isLocked ? 'img' : 'button'}
                        tabIndex={isLocked ? -1 : 0}
                        onClick={() => !isLocked && handlePhaseClick(phase)}
                        onKeyDown={(e) =>
                          !isLocked && e.key === 'Enter' && handlePhaseClick(phase)
                        }
                        aria-label={isLocked ? `Locked: complete previous phase first - ${phase.title}` : `View details: ${phase.title}`}
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
                        {phase.requiresClientApproval && !phase.clientApproved && (
                          <div className="project-phase-step-approval-badge" title="Requires client approval">
                            ⚠
                          </div>
                        )}
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
                    const isLocked = index > 0 && phases.slice(0, index).some((p) => p.status !== 'completed')
                    const weekNumber = phase.order || index + 1

                    return (
                      <div
                        key={phaseId}
                        className={`project-phase-label-wrap ${isLocked ? 'label-locked' : 'project-phase-label-clickable'} ${
                          isCompleted
                            ? 'label-completed'
                            : isInProgress
                            ? 'label-active'
                            : ''
                        }`}
                        style={{ '--step-i': index }}
                        role={isLocked ? 'img' : 'button'}
                        tabIndex={isLocked ? -1 : 0}
                        onClick={() => !isLocked && handlePhaseClick(phase)}
                        onKeyDown={(e) =>
                          !isLocked && e.key === 'Enter' && handlePhaseClick(phase)
                        }
                        aria-label={isLocked ? `Locked: complete previous phase first - ${phase.title}` : `View details: ${phase.title}`}
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
            const isLocked = index > 0 && phases.slice(0, index).some((p) => p.status !== 'completed')
            const subSteps = phase.subSteps || []
            const completedSubSteps = subSteps.filter((s) => s.completed).length
            const subStepsProgress = subSteps.length > 0 ? Math.round((completedSubSteps / subSteps.length) * 100) : null
            const weekNumber = phase.order || index + 1
            const statusLabel = isCompleted ? 'Completed' : isInProgress ? 'In Progress' : isLocked ? 'Locked' : 'Pending'

            return (
              <div
                key={phaseId}
                className={`project-phase-card ${isLocked ? 'phase-card-locked' : 'phase-card-clickable'} ${
                  isCompleted ? 'phase-card-completed' : isInProgress ? 'phase-card-in-progress' : 'phase-card-pending'
                }`}
                role={isLocked ? 'article' : 'button'}
                tabIndex={isLocked ? -1 : 0}
                onClick={() => !isLocked && handlePhaseClick(phase)}
                onKeyDown={(e) => !isLocked && e.key === 'Enter' && handlePhaseClick(phase)}
                aria-label={isLocked ? `Locked: ${phase.title}` : `View details: ${phase.title}`}
              >
                <div className="project-phase-card-header">
                  <span className="project-phase-card-week">Week {weekNumber}</span>
                  <span className={`project-phase-card-status project-phase-card-status--${phase.status || 'not_started'}`}>
                    {statusLabel}
                  </span>
                </div>
                <h4 className="project-phase-card-title">{phase.title || `Phase ${weekNumber}`}</h4>
                {subSteps.length > 0 && (
                  <div className="project-phase-card-progress">
                    <div className="project-phase-card-progress-bar">
                      <div
                        className="project-phase-card-progress-fill"
                        style={{ width: `${subStepsProgress}%` }}
                      />
                    </div>
                    <span className="project-phase-card-progress-label">
                      {completedSubSteps} of {subSteps.length} sub-steps
                    </span>
                  </div>
                )}
                {(phase.estimatedDurationDays || phase.actualDurationDays) && (
                  <div className="project-phase-card-duration">
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
                {phase.requiresClientApproval && !phase.clientApproved && (
                  <span className="project-phase-card-approval-badge" title="Requires client approval">⚠ Pending approval</span>
                )}
              </div>
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
