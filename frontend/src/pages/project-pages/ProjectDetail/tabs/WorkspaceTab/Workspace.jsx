import { useState, useEffect, useCallback, useRef } from 'react'
import { DndContext, closestCenter, useSensors, useSensor, PointerSensor, KeyboardSensor } from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useAuth } from '../../../../../context/AuthContext'
import { calculatePermissions } from '../../utils/userPermissionsUtils'
import { projectAPI } from '../../../../../services/api'
import CycleDetail from './components/CycleDetail'
import ProposalSubStepCard from './components/ProposalSubStepCard/ProposalSubStepCard'
import { getPhasesPendingApproval } from '../../../../../utils/phaseApprovalUtils'
import { Button, Alert, Input } from '../../../../../components/ui-components'
import './Workspace.css'

const STORAGE_KEY_PREFIX = 'workspace-create-steps-'
const DEBOUNCE_SAVE_MS = 500

import { formatDateOnly, getProjectDurationFromDates } from '../../../../../utils/dateUtils'

const formatDate = (d) => formatDateOnly(d, '—')

const Workspace = ({ project, previews = [], onPhaseUpdate, onWorkspaceConfirmed, onSwitchToPreviews }) => {
  const { user } = useAuth()
  const [selectedCycleIndex, setSelectedCycleIndex] = useState(0)

  const permissions = project && user ? calculatePermissions(user, project) : null
  const isClientOwner = permissions?.isClientOwner ?? false
  const isAssignedProgrammer = permissions?.isAssignedProgrammer ?? false
  const canConfirmWorkspace = permissions?.canConfirmWorkspace ?? true

  const projectId = project?._id || project?.id
  const storageKey = projectId ? `${STORAGE_KEY_PREFIX}${projectId}` : null
  const [userRequestedCreateSteps, setUserRequestedCreateStepsState] = useState(() => {
    if (!storageKey || typeof sessionStorage === 'undefined') return false
    return sessionStorage.getItem(storageKey) === 'true'
  })
  const setUserRequestedCreateSteps = useCallback(
    (value) => {
      setUserRequestedCreateStepsState(value)
      if (storageKey && typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(storageKey, value ? 'true' : '')
      }
    },
    [storageKey]
  )

  const [proposal, setProposal] = useState([])
  const [proposalLoading, setProposalLoading] = useState(false)
  const [proposalError, setProposalError] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [editingProposal, setEditingProposal] = useState([])
  const [reviewPhaseIndex, setReviewPhaseIndex] = useState(0)
  const saveTimeoutRef = useRef(null)

  const hasNoPhases = !project?.phases || project.phases.length === 0
  const canCreateSteps = permissions?.canCreateSteps ?? false
  const showCreateStepsArea = hasNoPhases && canConfirmWorkspace
  const showReviewWorkspace = hasNoPhases && canCreateSteps && userRequestedCreateSteps

  useEffect(() => {
    if (!showReviewWorkspace || !projectId) return
    let cancelled = false
    setProposalLoading(true)
    setProposalError(null)
    projectAPI
      .getPhaseProposal(projectId)
      .then((data) => {
        if (!cancelled) {
          const arr = Array.isArray(data) ? data : []
          setProposal(arr)
          setEditingProposal(arr.map((p) => ({ ...p })))
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
  }, [showReviewWorkspace, projectId])

  const saveProposal = useCallback(
    (payload) => {
      if (!projectId || !payload?.length) return
      projectAPI.savePhaseProposal(projectId, payload).catch(() => {})
    },
    [projectId]
  )

  useEffect(() => {
    if (editingProposal.length > 0 && reviewPhaseIndex >= editingProposal.length) {
      setReviewPhaseIndex(Math.max(0, editingProposal.length - 1))
    }
  }, [editingProposal.length, reviewPhaseIndex])

  useEffect(() => {
    if (!projectId || editingProposal.length === 0) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      saveProposal(editingProposal)
      saveTimeoutRef.current = null
    }, DEBOUNCE_SAVE_MS)
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [editingProposal, projectId, saveProposal])

  const handleProposalFieldChange = (index, field, value) => {
    setEditingProposal((prev) => {
      const next = prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
      return next
    })
  }

  const handleSubStepTitleChange = (phaseIndex, subStepIndex, newTitle) => {
    handleSubStepChange(phaseIndex, subStepIndex, { title: newTitle })
  }

  const handleSubStepChange = (phaseIndex, subStepIndex, updates) => {
    setEditingProposal((prev) =>
      prev.map((p, i) => {
        if (i !== phaseIndex) return p
        const subSteps = [...(p.subSteps || [])]
        if (subStepIndex >= subSteps.length) return p
        subSteps[subStepIndex] = { ...subSteps[subStepIndex], ...updates }
        return { ...p, subSteps }
      })
    )
  }

  const handleSubStepsReorder = (phaseIndex, activeId, overId) => {
    if (!overId || activeId === overId) return
    const match = (id) => {
      const m = String(id).match(/^phase-(\d+)-substep-(\d+)$/)
      return m ? { phaseIdx: parseInt(m[1], 10), subIdx: parseInt(m[2], 10) } : null
    }
    const active = match(activeId)
    const over = match(overId)
    if (!active || !over || active.phaseIdx !== over.phaseIdx || active.phaseIdx !== phaseIndex) return
    setEditingProposal((prev) =>
      prev.map((p, i) => {
        if (i !== phaseIndex) return p
        const subSteps = [...(p.subSteps || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        const reordered = arrayMove(subSteps, active.subIdx, over.subIdx)
        return { ...p, subSteps: reordered.map((s, idx) => ({ ...s, order: idx + 1 })) }
      })
    )
  }

  const handleRegenerateProposal = async () => {
    if (!window.confirm('This will replace your current proposal with an AI-generated timeline. Continue?')) return
    if (!projectId) return
    setRegenerating(true)
    setProposalError(null)
    try {
      const data = await projectAPI.regeneratePhaseProposal(projectId, editingProposal)
      const arr = Array.isArray(data) ? data : []
      setProposal(arr)
      setEditingProposal(arr.map((p) => ({ ...p })))
      setReviewPhaseIndex(0)
    } catch (err) {
      setProposalError(err.response?.data?.message || err.message || 'Failed to regenerate proposal')
    } finally {
      setRegenerating(false)
    }
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    const match = (id) => {
      const m = String(id).match(/^phase-(\d+)-substep-(\d+)$/)
      return m ? parseInt(m[1], 10) : null
    }
    const phaseIndex = match(active?.id)
    if (phaseIndex != null) handleSubStepsReorder(phaseIndex, active?.id, over?.id)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleConfirmWorkspace = async () => {
    if (!projectId || editingProposal.length === 0) return
    setConfirming(true)
    setProposalError(null)
    try {
      const payload = editingProposal.map((p, idx) => ({
        title: p.title || '',
        description: p.description ?? null,
        order: idx + 1,
        deliverables: Array.isArray(p.deliverables) ? p.deliverables : [],
        weeks: p.weeks != null ? p.weeks : null,
        dueDate: p.dueDate || null,
        subSteps: (Array.isArray(p.subSteps) ? p.subSteps : [])
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((s, i) => ({ ...s, order: i + 1 })),
      }))
      await projectAPI.confirmPhases(projectId, payload)
      onWorkspaceConfirmed?.()
    } catch (err) {
      setProposalError(err.response?.data?.message || err.message || 'Failed to confirm timeline')
    } finally {
      setConfirming(false)
    }
  }

  if (hasNoPhases && !canConfirmWorkspace) {
    return (
      <div className="timeline-empty">
        <p>No phases have been created for this project yet.</p>
        <p className="timeline-empty-hint">
          The assigned programmer will review and confirm the timeline from this Workspace.
        </p>
      </div>
    )
  }

  if (showCreateStepsArea && !userRequestedCreateSteps) {
    return (
      <section className="project-section project-phases">
        <div className="timeline-empty timeline-create-steps-empty">
          <p>No timeline yet. Create the project steps when you&apos;re ready to plan the work and align with the client.</p>
          {!canCreateSteps && (
            <p className="timeline-empty-hint text-ink-muted text-sm mb-3">
              The client must review the project and mark Ready first to unlock this.
            </p>
          )}
          <Button
            type="button"
            variant="primary"
            onClick={() => canCreateSteps && setUserRequestedCreateSteps(true)}
            disabled={!canCreateSteps}
            aria-label="Create project steps"
          >
            Create steps
          </Button>
        </div>
      </section>
    )
  }
  if (showReviewWorkspace && userRequestedCreateSteps) {
    const goals = project?.goals || []
    const features = project?.features || []
    const hasContext = goals.length > 0 || features.length > 0 || project?.description

    return (
      <section className="project-section project-phases">
        <h3 className="project-tab-panel-title">Review timeline</h3>
        <p className="timeline-proposal-intro">
          Review the proposed phases below. Edit title, description, or drag sub-steps to reorder. Then confirm to create the timeline.
        </p>
        {proposalLoading && <p className="timeline-proposal-loading">Loading proposal...</p>}
        {proposalError && <Alert variant="error">{proposalError}</Alert>}
        {!proposalLoading && editingProposal.length > 0 && (
          <div className="flex flex-col items-center justify-center w-full">
            {hasContext && (
              <div className="timeline-proposal-context w-full max-w-2xl mx-auto">
                <h4 className="timeline-proposal-context-title">Project context</h4>
                {(project?.startDate || project?.dueDate || project?.timeline) && (
                  <p className="timeline-proposal-context-overview text-sm text-ink-muted mb-2">
                    {project.startDate && project.dueDate
                      ? `${formatDate(project.startDate)} → ${formatDate(project.dueDate)}`
                      : project.dueDate
                        ? `Due: ${formatDate(project.dueDate)}`
                        : project.startDate
                          ? `Start: ${formatDate(project.startDate)}`
                          : project.timeline
                            ? `${(parseInt(project.timeline, 10) || 8) * 7} days`
                            : null}
                  </p>
                )}
                {project?.description && (
                  <p className="timeline-proposal-context-overview">{project.description.slice(0, 200)}{project.description.length > 200 ? '…' : ''}</p>
                )}
                {(goals.length > 0 || features.length > 0) && (
                  <div className="timeline-proposal-context-chips">
                    {goals.slice(0, 4).map((g, i) => (
                      <span key={`goal-${i}`} className="timeline-proposal-context-chip">{g}</span>
                    ))}
                    {features.slice(0, 4).map((f, i) => (
                      <span key={`feat-${i}`} className="timeline-proposal-context-chip">{f}</span>
                    ))}
                  </div>
                )}
                {previews?.length > 0 && typeof onSwitchToPreviews === 'function' && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="timeline-proposal-context-link"
                    onClick={onSwitchToPreviews}
                  >
                    View AI Previews ({previews.length})
                  </Button>
                )}
              </div>
            )}
            {canCreateSteps && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mb-4"
                onClick={handleRegenerateProposal}
                disabled={regenerating}
              >
                {regenerating ? 'Regenerating...' : 'Regenerate AI context'}
              </Button>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4 pb-3 border-b border-border w-full max-w-2xl" role="tablist" aria-label="Select phase to review">
                {editingProposal.map((_, idx) => {
                  const isActive = idx === reviewPhaseIndex
                  return (
                    <Button
                      key={idx}
                      type="button"
                      variant={isActive ? 'primary' : 'ghost'}
                      size="sm"
                      role="tab"
                      aria-selected={isActive}
                      aria-label={`Phase ${idx + 1}`}
                      onClick={() => setReviewPhaseIndex(idx)}
                      className="min-w-[1.75rem] px-1.5 text-xs"
                    >
                      {idx + 1}
                    </Button>
                  )
                })}
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <ul className="timeline-proposal-list w-full max-w-2xl mx-auto">
                {(() => {
                  const phaseIndex = Math.min(Math.max(0, reviewPhaseIndex), editingProposal.length - 1)
                  const phase = editingProposal[phaseIndex]
                  if (!phase) return null
                  const dateDuration = getProjectDurationFromDates(project)
                  const totalDaysFromDates = dateDuration?.totalDays ?? null
                  const timelineWeeks = parseInt(project?.timeline, 10) || 8
                  const effectiveTotalDays = totalDaysFromDates ?? timelineWeeks * 7
                  const toPhaseDays = (w) =>
                    Math.max(1, Math.min(effectiveTotalDays, Math.round((w ?? 1 / 7) * 7)))
                  const phaseDays = toPhaseDays(phase.weeks)
                  const daysBefore = editingProposal
                    .slice(0, phaseIndex)
                    .reduce((s, p) => s + toPhaseDays(p.weeks), 0)
                  const subSteps = [...(phase.subSteps || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                  const subStepIds = subSteps.map((_, i) => `phase-${phaseIndex}-substep-${i}`)
                  const phaseNum = phaseIndex + 1
                  const titleMatch = (phase.title || '').match(/^Phase\s*\d+\s*:\s*(.*)$/i)
                  const phaseName = titleMatch ? (titleMatch[1] || '').trim() : (phase.title || '')
                  const handlePhaseNameChange = (value) => {
                    handleProposalFieldChange(phaseIndex, 'title', `Phase ${phaseNum}: ${value.trim()}`.trimEnd())
                  }
                  const daysForAnchor = totalDaysFromDates ?? timelineWeeks * 7
                  const anchor = project?.startDate
                    ? new Date(project.startDate)
                    : project?.dueDate && daysForAnchor > 0
                      ? (() => {
                          const x = new Date(project.dueDate)
                          x.setDate(x.getDate() - daysForAnchor)
                          return x
                        })()
                      : null
                  const derivedDueDate = anchor
                    ? (() => {
                        const x = new Date(anchor)
                        x.setDate(x.getDate() + phaseDays + daysBefore)
                        return x
                      })()
                    : null
                  return (
                    <li key={phaseIndex} className="timeline-proposal-item flex flex-col items-center">
                      <div className="grid grid-cols-1 gap-3 max-w-2xl w-full">
                        <label className="timeline-proposal-label">
                          <span className="font-heading text-xs uppercase text-ink-muted">Phase {phaseNum}</span>
                          <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className="font-heading text-lg uppercase text-ink shrink-0">Phase {phaseNum}:</span>
                            <Input
                              type="text"
                              value={phaseName}
                              onChange={(e) => handlePhaseNameChange(e.target.value)}
                              placeholder="e.g. Discovery & Planning"
                              className="!py-1.5 !px-2.5 text-sm border flex-1 font-heading text-lg uppercase"
                            />
                          </div>
                        </label>
                        <label className="timeline-proposal-label">
                          <span className="font-heading text-xs uppercase text-ink-muted">Description</span>
                          <Input
                            type="text"
                            value={(() => {
                              const d = phase.description ?? ''
                              if (typeof d === 'string' && /^\d+\s*week(s)?$/i.test(d.trim())) return ''
                              return d
                            })()}
                            onChange={(e) => handleProposalFieldChange(phaseIndex, 'description', e.target.value)}
                            placeholder="e.g. Go live with the platform"
                            className="!py-1.5 !px-2.5 text-sm border"
                          />
                        </label>
                        <label className="timeline-proposal-label">
                          <span className="font-heading text-xs uppercase text-ink-muted">Days</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Input
                              type="number"
                              min={1}
                              max={effectiveTotalDays}
                              value={phaseDays}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10)
                                handleProposalFieldChange(
                                  phaseIndex,
                                  'weeks',
                                  Number.isNaN(v) ? null : v / 7
                                )
                              }}
                              placeholder="e.g. 3"
                              className="!py-1.5 !px-2.5 text-sm border w-20"
                            />
                            <span className="font-body text-xs text-ink-muted">days</span>
                          </div>
                        </label>
                        <label className="timeline-proposal-label">
                          <span className="font-heading text-xs uppercase text-ink-muted">Due date</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <input
                              type="date"
                              value={(() => {
                                const d = phase.dueDate ? new Date(phase.dueDate) : derivedDueDate
                                if (!d || Number.isNaN(d.getTime())) return ''
                                return d.toISOString().slice(0, 10)
                              })()}
                              onChange={(e) => {
                                const val = e.target.value
                                handleProposalFieldChange(phaseIndex, 'dueDate', val ? new Date(val).toISOString() : null)
                              }}
                              className="px-2.5 py-1.5 text-sm border border-border rounded-none font-body"
                            />
                          </div>
                        </label>
                      {subSteps.length > 0 && (
                        <div className="timeline-proposal-substeps max-w-2xl col-span-1 flex flex-col items-center">
                          <span className="timeline-proposal-substeps-label font-heading text-xs uppercase text-ink-muted mb-2">
                            Sub-steps
                          </span>
                          <SortableContext items={subStepIds} strategy={verticalListSortingStrategy}>
                            <div className="mt-2 w-full flex flex-col items-stretch">
                              {subSteps.map((s, i) => {
                                const phaseDurationDays = toPhaseDays(phase.weeks)
                                const phaseStart = anchor
                                  ? (() => {
                                      const start = new Date(anchor)
                                      start.setDate(start.getDate() + daysBefore)
                                      return start
                                    })()
                                  : null
                                const segmentDays = subSteps.length > 0 ? phaseDurationDays / subSteps.length : 0
                                const subStepStartDate =
                                  phaseStart && segmentDays > 0
                                    ? new Date(phaseStart.getTime() + segmentDays * i * 24 * 60 * 60 * 1000)
                                    : null
                                const subStepDueDate =
                                  phaseStart && segmentDays > 0
                                    ? new Date(phaseStart.getTime() + segmentDays * (i + 1) * 24 * 60 * 60 * 1000)
                                    : null
                                const subStepEstimatedDays = segmentDays > 0 ? Math.round(segmentDays) : null
                                return (
                                  <ProposalSubStepCard
                                    key={subStepIds[i]}
                                    id={subStepIds[i]}
                                    subStep={s}
                                    subStepIndex={i}
                                    startDate={subStepStartDate}
                                    dueDate={subStepDueDate}
                                    estimatedDurationDays={subStepEstimatedDays}
                                    onChange={(idx, updates) => {
                                      if (typeof updates === 'string') {
                                        handleSubStepTitleChange(phaseIndex, idx, updates)
                                      } else {
                                        handleSubStepChange(phaseIndex, idx, updates)
                                      }
                                    }}
                                  />
                                )
                              })}
                            </div>
                          </SortableContext>
                        </div>
                      )}
                      </div>
                    </li>
                  )
                })()}
              </ul>
            </DndContext>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmWorkspace}
              disabled={confirming}
              className="mt-4"
            >
              {confirming ? 'Confirming...' : 'Confirm timeline'}
            </Button>
          </div>
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

  const selectedIndex = Math.min(Math.max(0, selectedCycleIndex), Math.max(0, phases.length - 1))
  const currentPhase = phases[selectedIndex] || null

  const handlePhaseUpdate = (updatedPhase) => {
    if (onPhaseUpdate) {
      onPhaseUpdate(updatedPhase)
    }
  }

  const hasProjectSummary =
    project?.description ||
    project?.technologies?.length > 0 ||
    project?.startDate ||
    project?.dueDate ||
    project?.timeline ||
    previews?.length > 0

  return (
    <section className="project-section project-phases">
      {hasProjectSummary && (
        <details className="workspace-project-summary">
          <summary className="workspace-project-summary-trigger">Project summary</summary>
          <div className="workspace-project-summary-content">
            {(project?.startDate || project?.dueDate || project?.timeline) && (
              <p className="workspace-project-summary-overview text-sm text-ink-muted mb-2">
                {project.startDate && project.dueDate
                  ? `${formatDate(project.startDate)} → ${formatDate(project.dueDate)}`
                  : project.dueDate
                    ? `Due: ${formatDate(project.dueDate)}`
                    : project.startDate
                      ? `Start: ${formatDate(project.startDate)}`
                      : project.timeline
                        ? `${(parseInt(project.timeline, 10) || 8) * 7} days`
                        : null}
              </p>
            )}
            {project?.description && (
              <p className="workspace-project-summary-overview">{project.description}</p>
            )}
            {project?.technologies?.length > 0 && (
              <p className="workspace-project-summary-tech">
                <span className="workspace-project-summary-label">Tech stack:</span>{' '}
                {project.technologies.join(', ')}
              </p>
            )}
            {previews?.length > 0 && typeof onSwitchToPreviews === 'function' && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={onSwitchToPreviews}
              >
                View AI Previews ({previews.length})
              </Button>
            )}
          </div>
        </details>
      )}

      {showPendingApprovalsStrip && (
        <Alert variant="warning" className="mb-4">
          You have {pendingApprovals.length} phase(s) awaiting your approval. Review and approve in the cycle below.
        </Alert>
      )}

      <h3 className="project-tab-panel-title">Project Cycle</h3>

      <div className="workspace-cycle">
        <div className="workspace-cycle-tabs" role="tablist" aria-label="Select cycle">
          {phases.map((phase, index) => {
            const phaseId = phase._id || phase.id
            const isCompleted = phase.status === 'completed'
            const isInProgress = phase.status === 'in_progress'
            const cycleNumber = phase.order ?? index + 1
            const isSelected = index === selectedIndex
            return (
              <Button
                key={phaseId}
                type="button"
                variant={isSelected ? 'primary' : 'ghost'}
                role="tab"
                aria-selected={isSelected}
                aria-label={`Cycle ${cycleNumber}: ${phase.title || `Phase ${cycleNumber}`}`}
                className={`workspace-cycle-tab ${isSelected ? 'workspace-cycle-tab-active' : ''} ${
                  isCompleted ? 'workspace-cycle-tab-completed' : isInProgress ? 'workspace-cycle-tab-in-progress' : ''
                }`}
                onClick={() => setSelectedCycleIndex(index)}
              >
                Cycle {cycleNumber}
              </Button>
            )
          })}
        </div>
      </div>

      {currentPhase && permissions && (
        <CycleDetail
          phase={currentPhase}
          project={project}
          phases={phases}
          isClientOwner={isClientOwner}
          isAssignedProgrammer={isAssignedProgrammer}
          canChangePhaseStatus={permissions.canChangePhaseStatus}
          canUpdateSubSteps={permissions.canUpdateSubSteps}
          canAnswerQuestion={permissions.canAnswerQuestion}
          canSaveNotes={permissions.canSaveNotes}
          canUploadAttachments={permissions.canUploadAttachments}
          isProgrammerOrAdmin={permissions.isProgrammerOrAdmin}
          userId={user?._id || user?.id}
          onUpdate={handlePhaseUpdate}
          embedded
        />
      )}
    </section>
  )
}

export default Workspace
