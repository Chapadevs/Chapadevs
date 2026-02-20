import { useState } from 'react'
import { Button } from '../../../../../components/ui-components'
import EditProjectModal from './components/EditProjectModal/EditProjectModal'

const formatDate = (d) => {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

const SettingsTab = ({
  project,
  onDelete,
  onMarkReady,
  onConfirmReady,
  onToggleTeamClosed,
  onStartDevelopment,
  onStopDevelopment,
  onMarkHolding,
  onMarkCompleted,
  onCancelProject,
  onLeaveProject,
  onEditSave,
  markingReady,
  confirmingReady,
  togglingTeamClosed,
  startingDevelopment,
  stoppingDevelopment,
  markingHolding,
  markingCompleted,
  markingCancelled,
  leavingProject,
  ...permissions
}) => {
  const [showEditModal, setShowEditModal] = useState(false)
  const hasTeamActions =
    permissions.canToggleTeamClosed ||
    permissions.canConfirmReady ||
    permissions.canMarkReady ||
    permissions.showMarkReady ||
    permissions.showConfirmReady
  const hasDevActions =
    permissions.canStartDevelopment ||
    permissions.showStartDevelopment ||
    permissions.canStopDevelopment ||
    permissions.canSetToHolding ||
    permissions.canMarkCompleted ||
    (project.status === 'Ready' && permissions.isClientOwner)

  const clientName = project.clientId?.name ?? project.clientId ?? '—'
  const programmers = [
    ...(project.assignedProgrammerId ? [project.assignedProgrammerId] : []),
    ...(project.assignedProgrammerIds || []),
  ]
  const programmerNames = programmers
    .map((p) => (typeof p === 'object' && p?.name ? p.name : null))
    .filter(Boolean)
  const readyCount = (project.readyConfirmedBy || []).length

  return (
    <div className="flex flex-col gap-8">
        {/* Recruitment / Team */}
        {hasTeamActions && (
        <div className="flex flex-col gap-3 pb-6 border-b border-border">
          <h4 className="text-sm font-heading font-bold uppercase text-ink">Team & recruitment</h4>
          <div className="flex flex-wrap gap-3">
            {permissions.canToggleTeamClosed && (
              <Button
                variant="primary"
                size="sm"
                onClick={onToggleTeamClosed}
                disabled={togglingTeamClosed}
              >
                {togglingTeamClosed ? 'Updating...' : project.teamClosed ? 'Open Team' : 'Close Team'}
              </Button>
            )}
            {(permissions.showConfirmReady || permissions.canConfirmReady) && (
              <Button
                variant="primary"
                size="sm"
                onClick={onConfirmReady}
                disabled={confirmingReady || !permissions.canConfirmReady}
              >
                {confirmingReady ? 'Confirming...' : "I'm Ready"}
              </Button>
            )}
            {(permissions.showMarkReady || permissions.canMarkReady) && (
              <Button
                variant="primary"
                size="sm"
                onClick={onMarkReady}
                disabled={markingReady || !permissions.canMarkReady}
              >
                {markingReady ? 'Marking...' : 'Mark Ready'}
              </Button>
            )}
          </div>
        </div>
      )}
      {/* Project summary (read-only) */}
      <div className="flex flex-col gap-3 pb-6 border-b border-border">
        <div className="flex items-center justify-between gap-4">
          <h4 className="text-sm font-heading font-bold uppercase text-ink">Project summary</h4>
          {permissions.canEdit && onEditSave && (
            <Button variant="secondary" size="sm" onClick={() => setShowEditModal(true)}>
              Edit project
            </Button>
          )}
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 font-body text-sm">
          <div>
            <dt className="text-ink-muted">Status</dt>
            <dd className="font-medium">{project.status ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Priority</dt>
            <dd className="font-medium">{project.priority ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Project type</dt>
            <dd className="font-medium">{project.projectType ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Budget</dt>
            <dd className="font-medium">{project.budget ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Timeline</dt>
            <dd className="font-medium">{project.timeline ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Start date</dt>
            <dd className="font-medium">{formatDate(project.startDate)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Due date</dt>
            <dd className="font-medium">{formatDate(project.dueDate)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Completed date</dt>
            <dd className="font-medium">{formatDate(project.completedDate)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-ink-muted">Client</dt>
            <dd className="font-medium">{clientName}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-ink-muted">Assigned programmer(s)</dt>
            <dd className="font-medium">
              {programmerNames.length ? programmerNames.join(', ') : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Teamclosed</dt>
            <dd className="font-medium">{project.teamClosed ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Ready confirmed</dt>
            <dd className="font-medium">{readyCount} of {programmers.length || 0}</dd>
          </div>
        </dl>
      </div>

      {/* Development */}
      {hasDevActions && (
        <div className="flex flex-col gap-3 pb-6 border-b border-border">
          <h4 className="text-sm font-heading font-bold uppercase text-ink">Development</h4>
          {project.status === 'Ready' && permissions.isClientOwner && (
            <p className="font-body text-sm text-ink-muted">
              Waiting for programmer to start the project.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {(permissions.showStartDevelopment || permissions.canStartDevelopment) && (
              <Button
                variant="primary"
                size="sm"
                onClick={onStartDevelopment}
                disabled={startingDevelopment || !permissions.canStartDevelopment}
              >
                {startingDevelopment ? 'Starting...' : 'Start Development'}
              </Button>
            )}
            {permissions.canStopDevelopment && (
              <Button
                variant="primary"
                size="sm"
                onClick={onStopDevelopment}
                disabled={stoppingDevelopment}
              >
                {stoppingDevelopment ? 'Stopping...' : 'Stop Development'}
              </Button>
            )}
            {permissions.canSetToHolding && (
              <Button
                variant="primary"
                size="sm"
                onClick={onMarkHolding}
                disabled={markingHolding}
              >
                {markingHolding ? 'Updating...' : 'Set to On Hold'}
              </Button>
            )}
            {permissions.canMarkCompleted && (
              <Button
                variant="primary"
                size="sm"
                onClick={onMarkCompleted}
                disabled={markingCompleted}
              >
                {markingCompleted ? 'Updating...' : 'Mark as Completed'}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Danger Zone */}
      {(permissions.canDelete ||
        permissions.canCancel ||
        permissions.isProgrammerInProject) && (
        <div className="mt-4 p-4 rounded-none border border-red-200 bg-red-50/30">
          <h4 className="text-red-600 text-sm font-heading font-bold uppercase mb-3">
            Danger Zone
          </h4>
          <div className="flex flex-wrap gap-3">
            {permissions.isProgrammerInProject && (
              <Button
                variant="danger"
                size="sm"
                onClick={onLeaveProject}
                disabled={leavingProject}
              >
                Leave Project
              </Button>
            )}
            {permissions.canCancel && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-100"
                onClick={onCancelProject}
                disabled={markingCancelled}
              >
                {markingCancelled ? 'Cancelling...' : 'Cancel Project'}
              </Button>
            )}
            {permissions.canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-100"
                onClick={onDelete}
              >
                Delete Project
              </Button>
            )}
          </div>
        </div>
      )}

      {showEditModal && (
        <EditProjectModal
          project={project}
          onSave={onEditSave}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  )
}

export default SettingsTab
