/**
 * Full project deletion: removes all related data and GCS assets.
 * Used by projectController.deleteProject and userDeletionService.
 */

import Project from '../models/Project.js'
import ProjectPhase from '../models/ProjectPhase.js'
import ProjectActivity from '../models/ProjectActivity.js'
import Message from '../models/Message.js'
import Notification from '../models/Notification.js'
import AIPreview from '../models/AIPreview.js'
import { deleteProjectAttachment } from './projectAttachmentStorage.js'

/**
 * Delete all GCS attachments from a phase (phase-level and sub-step attachments).
 * @param {Object} phase - ProjectPhase document
 */
async function deletePhaseAttachmentsFromGCS(phase) {
  const urlsToDelete = []

  // Phase-level attachments
  for (const a of phase.attachments || []) {
    if (a?.url) urlsToDelete.push(a.url)
  }

  // Sub-step attachments
  for (const sub of phase.subSteps || []) {
    for (const a of sub.attachments || []) {
      if (a?.url) urlsToDelete.push(a.url)
    }
  }

  for (const url of urlsToDelete) {
    if (url?.startsWith('https://storage.googleapis.com/') || url?.startsWith('attachments/')) {
      await deleteProjectAttachment(url).catch((err) =>
        console.warn('GCS delete failed for phase attachment:', err?.message)
      )
    }
  }
}

/**
 * Delete all GCS attachments from project root, messages, and phases.
 * @param {Object} project - Project document
 * @param {Object[]} phases - ProjectPhase documents
 * @param {Object[]} messages - Message documents
 */
async function deleteAllProjectAssetsFromGCS(project, phases, messages) {
  const deleteUrl = async (url) => {
    if (url?.startsWith('https://storage.googleapis.com/') || url?.startsWith('attachments/')) {
      await deleteProjectAttachment(url).catch((err) =>
        console.warn('GCS delete failed for project asset:', err?.message)
      )
    }
  }

  // Project-level attachments
  for (const a of project.attachments || []) {
    const url = typeof a === 'object' ? a?.url : null
    if (url) await deleteUrl(url)
  }

  // Message attachments
  for (const msg of messages || []) {
    for (const a of msg.attachments || []) {
      if (a?.url) await deleteUrl(a.url)
    }
  }

  // Phase and sub-step attachments
  for (const phase of phases || []) {
    await deletePhaseAttachmentsFromGCS(phase)
  }
}

/**
 * Permanently delete a project and all related data.
 * - ProjectPhase, ProjectActivity, Message, Notification, AIPreview
 * - All GCS attachments (phases, sub-steps, messages, project root)
 * @param {string} projectId - MongoDB ObjectId of the project
 */
export async function deleteProjectFully(projectId) {
  const project = await Project.findById(projectId)
  if (!project) return

  const phases = await ProjectPhase.find({ projectId: project._id })
  const messages = await Message.find({ projectId: project._id })

  // Delete GCS assets first
  await deleteAllProjectAssetsFromGCS(project, phases, messages)

  // Delete related documents
  await ProjectPhase.deleteMany({ projectId: project._id })
  await ProjectActivity.deleteMany({ projectId: project._id })
  await Message.deleteMany({ projectId: project._id })
  await Notification.deleteMany({ projectId: project._id })
  await AIPreview.deleteMany({ projectId: project._id })

  await project.deleteOne()
}
