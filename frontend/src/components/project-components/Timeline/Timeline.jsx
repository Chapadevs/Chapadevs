import { useState, useRef } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { calculatePermissions } from '../../../pages/project-pages/ProjectDetail/utils/projectUtils'
import PhaseDetail from './PhaseDetail'
import './Timeline.css'

const Timeline = ({ project, previews = [], onPhaseUpdate }) => {
  const { user } = useAuth()
  const [selectedPhase, setSelectedPhase] = useState(null)
  const phasesScrollRef = useRef(null)

  const permissions = project && user ? calculatePermissions(user, project) : null
  const isClientOwner = permissions?.isClientOwner ?? false
  const isAssignedProgrammer = permissions?.isAssignedProgrammer ?? false

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
