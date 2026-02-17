import { Button, SecondaryButton } from '../../../../../components/ui-components'

const SettingsTab = ({
  project,
  onDelete,
  onMarkReady,
  onConfirmReady,
  onToggleTeamClosed,
  onStartDevelopment,
  onStopDevelopment,
  onMarkHolding,
  onLeaveProject,
  markingReady,
  confirmingReady,
  togglingTeamClosed,
  startingDevelopment,
  stoppingDevelopment,
  markingHolding,
  leavingProject,
  ...permissions // This catches canDelete, canMarkReady, etc.
}) => {
  return (
    <div className="flex flex-col gap-8">
      {/* ACTION TOOLBAR */}
      <div className="flex flex-wrap gap-3 pb-6 border-b border-gray-100">
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

        {permissions.canConfirmReady && (
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirmReady}
            disabled={confirmingReady}
          >
            {confirmingReady ? 'Confirming...' : "I'm Ready"}
          </Button>
        )}

        {permissions.canMarkReady && (
          <Button
            variant="primary"
            size="sm"
            onClick={onMarkReady}
            disabled={markingReady || !permissions.allTeamConfirmedReady}
          >
            {markingReady ? 'Marking...' : 'Mark Ready'}
          </Button>
        )}

        {permissions.canStartDevelopment && (
          <Button
            variant="primary"
            size="sm"
            onClick={onStartDevelopment}
            disabled={startingDevelopment}
          >
            {startingDevelopment ? 'Starting...' : 'Start Development'}
          </Button>
        )}
      </div>

      {/* DANGER ZONE */}
      {(permissions.canDelete || permissions.isProgrammerInProject) && (
        <div className="mt-12 p-4 rounded-lg border border-red-100 bg-red-50/30">
          <h4 className="text-red-600 text-sm font-bold mb-3">Danger Zone</h4>
          <div className="flex gap-4">
            {permissions.isProgrammerInProject && (
              <Button variant="danger" size="sm" onClick={onLeaveProject} disabled={leavingProject}>
                Leave Project
              </Button>
            )}
            {permissions.canDelete && (
              <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-100" onClick={onDelete}>
                Delete Project
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsTab