import { useState, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import PhaseDetail from './PhaseDetail'
import './Timeline.css'

const Timeline = ({ project, previews = [], onPhaseUpdate, onSwitchToPreviews }) => {
  const { user } = useAuth()
  const [selectedPhase, setSelectedPhase] = useState(null)
  const phasesScrollRef = useRef(null)

  if (!project?.phases || project.phases.length === 0) {
    return (
      <div className="timeline-empty">
        <p>No phases have been created for this project yet.</p>
        {project?.status === 'Development' && (
          <p className="timeline-empty-hint">
            Phases will be automatically created when a programmer is assigned to the project.
          </p>
        )}
      </div>
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

  const userIdStr = (user?._id || user?.id)?.toString()
  const clientIdStr = (project.clientId?._id || project.clientId)?.toString()
  const assignedProgrammerIdStr = (project.assignedProgrammerId?._id || project.assignedProgrammerId)?.toString()
  const isClientOwner = userIdStr && clientIdStr && clientIdStr === userIdStr
  const isAssignedProgrammer = userIdStr && assignedProgrammerIdStr && assignedProgrammerIdStr === userIdStr

  const handlePhaseClick = (phase) => {
    setSelectedPhase(phase)
  }

  const handlePhaseUpdate = (updatedPhase) => {
    if (onPhaseUpdate) {
      onPhaseUpdate(updatedPhase)
    }
    setSelectedPhase(null)
  }

  const previewsCount = previews?.length || 0
  const completedPreviews = previews?.filter((p) => p.status === 'completed').length || 0

  return (
    <>
      <section className="project-section project-phases">
        <h2>Development Progress</h2>
        
        {/* AI Preview Context Section */}
        <div className="timeline-ai-preview-context">
          <div className="timeline-preview-status">
            <span className="preview-count-badge">
              {previewsCount} AI Preview{previewsCount !== 1 ? 's' : ''} Generated
            </span>
            {isAssignedProgrammer && previewsCount > 0 && onSwitchToPreviews && (
              <button
                type="button"
                className="btn btn-sm btn-secondary timeline-preview-link"
                onClick={onSwitchToPreviews}
              >
                View AI Previews →
              </button>
            )}
          </div>
          {previewsCount === 0 && project.status === 'Development' && (
            <p className="timeline-preview-hint">
              ⚠️ No AI previews available. Phases were created from project templates.
            </p>
          )}
          {previewsCount > 0 && (
            <p className="timeline-preview-info">
              {isClientOwner && 'Your AI previews inform the development phases below.'}
              {isAssignedProgrammer && !isClientOwner && 'Review the AI previews to understand project requirements before starting development.'}
            </p>
          )}
        </div>

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
            <button
              type="button"
              className="project-phases-scroll-btn project-phases-scroll-prev"
              onClick={() => scrollPhases('prev')}
              aria-label="Previous steps"
            >
              ‹
            </button>
            <div
              ref={phasesScrollRef}
              className="project-phases-scroll"
              role="region"
              aria-label="Project phases"
            >
              <div
                className="project-phases-scroll-inner"
                style={{
                  '--phases-step-width': 130,
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
                    const estimatedDays = phase.estimatedDurationDays
                    const actualDays = phase.actualDurationDays

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
                          {phase.title}
                        </span>
                        {(estimatedDays || actualDays) && (
                          <span className="project-phase-label-duration">
                            {actualDays
                              ? `${actualDays}d`
                              : estimatedDays
                              ? `~${estimatedDays}d`
                              : ''}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="project-phases-scroll-btn project-phases-scroll-next"
              onClick={() => scrollPhases('next')}
              aria-label="Next steps"
            >
              ›
            </button>
          </div>
        </div>
      </section>

      {selectedPhase && (
        <PhaseDetail
          phase={selectedPhase}
          project={project}
          user={user}
          isClientOwner={isClientOwner}
          isAssignedProgrammer={isAssignedProgrammer}
          onClose={() => setSelectedPhase(null)}
          onUpdate={handlePhaseUpdate}
        />
      )}
    </>
  )
}

export default Timeline
