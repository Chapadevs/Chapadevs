import ProjectActivity from '../models/ProjectActivity.js'

/**
 * Log a project activity event (one row per event).
 * @param {string|import('mongoose').Types.ObjectId} projectId
 * @param {string|import('mongoose').Types.ObjectId} actorId
 * @param {string} action - e.g. 'project.created', 'project.status_changed', 'phases.confirmed', 'phase.started', 'phase.completed', 'phase.approved', 'phase.updated', 'preview.generated'
 * @param {string} [targetType] - 'project', 'phase', 'preview'
 * @param {string|import('mongoose').Types.ObjectId} [targetId]
 * @param {Object} [metadata] - e.g. { fromStatus, toStatus }, { phaseTitle }
 */
export async function logProjectActivity(projectId, actorId, action, targetType = null, targetId = null, metadata = null) {
  try {
    await ProjectActivity.create({
      projectId,
      actorId,
      action,
      targetType: targetType || undefined,
      targetId: targetId || undefined,
      metadata: metadata || undefined,
    })
  } catch (err) {
    console.error('Failed to log project activity:', err)
  }
}
