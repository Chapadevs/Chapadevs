import { useState, useEffect } from 'react'
import { useAuth } from '../../../../../context/AuthContext'
import { calculatePermissions } from '../../utils/userPermissionsUtils'
import { projectAPI } from '../../../../../services/api'
import CycleDetail from './components/CycleDetail'
import { getPhasesPendingApproval } from '../../../../../utils/phaseApprovalUtils'
import { Button, Alert, Input } from '../../../../../components/ui-components'
import './Workspace.css'

const Workspace = ({ project, previews = [], onPhaseUpdate, onWorkspaceConfirmed }) => {
  const { user } = useAuth()
  const [selectedCycleIndex, setSelectedCycleIndex] = useState(0)

  const permissions = project && user ? calculatePermissions(user, project) : null
  const isClientOwner = permissions?.isClientOwner ?? false
  const isAssignedProgrammer = permissions?.isAssignedProgrammer ?? false
  const canConfirmWorkspace = permissions?.canConfirmWorkspace ?? true

  const [userRequestedCreateSteps, setUserRequestedCreateSteps] = useState(false)
  const [proposal, setProposal] = useState([])
  const [proposalLoading, setProposalLoading] = useState(false)
  const [proposalError, setProposalError] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [editingProposal, setEditingProposal] = useState([])

  const projectId = project?._id || project?.id
  const hasNoPhases = !project?.phases || project.phases.length === 0
  const canCreateSteps = permissions?.canCreateSteps ?? false
  const showReviewWorkspace = hasNoPhases && canCreateSteps

  useEffect(() => {
    if (!showReviewWorkspace || !userRequestedCreateSteps || !projectId) return
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
  }, [showReviewWorkspace, userRequestedCreateSteps, projectId])

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

  const handleConfirmWorkspace = async () => {
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

  if (hasNoPhases && canConfirmWorkspace && !canCreateSteps) {
    return (
      <div className="timeline-empty">
        <p>No timeline yet.</p>
        <p className="timeline-empty-hint">
          The client must review the project and mark it ready first. Then you can create the project steps here.
        </p>
      </div>
    )
  }

  if (showReviewWorkspace && !userRequestedCreateSteps) {
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
  if (showReviewWorkspace && userRequestedCreateSteps) {
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
              onClick={handleConfirmWorkspace}
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

  const selectedIndex = Math.min(Math.max(0, selectedCycleIndex), Math.max(0, phases.length - 1))
  const currentPhase = phases[selectedIndex] || null

  const handlePhaseUpdate = (updatedPhase) => {
    if (onPhaseUpdate) {
      onPhaseUpdate(updatedPhase)
    }
  }

  return (
    <section className="project-section project-phases">
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
