import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { projectAPI } from '../../../../../services/api'
import { Button } from '../../../../../components/ui-components'
import NotificationBadge from '../../../../../components/ui-components/NotificationBadge/NotificationBadge'

const ACTION_LABELS = {
  'project.created': 'Created project',
  'project.updated': 'Updated project',
  'project.status_changed': 'Changed project status',
  'phases.confirmed': 'Confirmed timeline',
  'phase.started': 'Started phase',
  'phase.completed': 'Completed phase',
  'phase.approved': 'Approved phase',
  'phase.updated': 'Updated phase',
  'preview.generated': 'Generated preview',
  'programmer.joined': 'Joined the project',
  'programmer.left': 'Left the project',
  'programmer.removed': 'Removed a programmer from the project',
  'programmer.confirmed_ready': "Confirmed they're ready for development",
  'phase.notes_updated': 'Updated phase notes',
  'phase.description_updated': 'Updated phase description',
  'phase.deliverables_updated': 'Updated phase deliverables',
  'phase.substep_added': 'Added sub-step',
  'phase.substep_updated': 'Updated sub-step',
  'phase.substep_completed': 'Completed sub-step',
  'phase.question_answered': 'Answered question',
  'phase.attachment_uploaded': 'Uploaded attachment',
  'phase.attachment_deleted': 'Deleted attachment',
  'project.updated': 'Updated project',
  'project.deleted': 'Deleted project',
}

function formatActionLabel(action, metadata) {
  const base = ACTION_LABELS[action] || action.replace(/_/g, ' ').replace(/\./g, ' ')
  if (action === 'project.status_changed' && metadata?.fromStatus && metadata?.toStatus) {
    return `${base} (${metadata.fromStatus} → ${metadata.toStatus})`
  }
  if (metadata?.phaseTitle) {
    return `${base}: ${metadata.phaseTitle}`
  }
  if (action === 'programmer.joined' && metadata?.role) {
    return metadata.role === 'accepted' ? 'Joined the project' : 'Was assigned to the project'
  }
  return base
}

function formatDate(createdAt) {
  if (!createdAt) return ''
  const d = new Date(createdAt)
  const now = new Date()
  const diffMs = now - d
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString(undefined, { dateStyle: 'short' })
}

const ActivityTab = ({ project }) => {
  const { id } = useParams()
  const [data, setData] = useState({ activities: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadActivity = (page = 1) => {
    if (!id) return
    setLoading(true)
    setError(null)
    projectAPI
      .getActivity(id, { page, limit: 20 })
      .then(setData)
      .catch((err) => setError(err.response?.data?.message || err.message || 'Failed to load activity'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadActivity(1)
  }, [id])

  const { activities, pagination } = data

  return (
    <section className="project-section project-activity">
      <h3 className="project-tab-panel-title font-heading text-sm uppercase tracking-wider border-l-4 border-primary pl-3 mb-4">
        Activity
      </h3>
      <p className="text-ink-muted text-sm mb-6">
        Recent actions on this project. Client and team see the same feed.
      </p>
      {error && (
        <p className="text-red-600 text-sm mb-4">{error}</p>
      )}
      {loading ? (
        <p className="text-ink-muted text-sm">Loading activity...</p>
      ) : activities.length === 0 ? (
        <p className="text-ink-muted text-sm">No activity yet.</p>
      ) : (
        <>
          <ul className="space-y-3 list-none p-0 m-0">
            {activities.map((item) => (
              <li
                key={item._id}
                className="flex items-start gap-3 py-2 border-b border-border last:border-0"
              >
                <span className="text-ink-muted text-xs shrink-0 mt-0.5">
                  {formatDate(item.createdAt)}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="font-body text-ink">
                    {item.actorId?.name ?? 'Someone'}
                  </span>
                  <span className="text-ink-muted"> {formatActionLabel(item.action, item.metadata)}</span>
                </div>

                <NotificationBadge className="ml-2 inline-block h-2 w-2 rounded-full bg-green-600 align-middle" />
              </li>
            ))}
          </ul>
          {pagination.pages > 1 && (
            <div className="flex items-center gap-2 mt-6">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => loadActivity(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              <span className="text-ink-muted text-sm">
                Page {pagination.page} of {pagination.pages}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => loadActivity(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default ActivityTab
