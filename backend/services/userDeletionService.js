/**
 * Full user deletion: cascades to projects, notifications, messages, assets, etc.
 * Ensures no trace of the user remains in the database or storage.
 */

import mongoose from 'mongoose'
import User from '../models/User.js'
import Project from '../models/Project.js'
import ProjectPhase from '../models/ProjectPhase.js'
import Message from '../models/Message.js'
import Notification from '../models/Notification.js'
import AIPreview from '../models/AIPreview.js'
import SupportTicket from '../models/SupportTicket.js'
import { deleteAvatarFromGCS, isGcsAvatar } from '../utils/avatarStorage.js'
import { deleteProjectFully } from '../utils/projectDeletion.js'

/**
 * Permanently delete a user and ALL related data.
 * - All projects owned by the user (clientId)
 * - Notifications for the user
 * - AIPreview records for the user
 * - Support tickets for the user
 * - Avatar from GCS
 * - The user document
 * @param {string} userId - MongoDB ObjectId of the user
 */
export async function deleteUserFully(userId) {
  const user = await User.findById(userId)
  if (!user) return

  // 1. Delete all projects owned by this user (cascades to phases, activity, messages, notifications, AIPreview, GCS assets)
  const ownedProjects = await Project.find({ clientId: userId }).select('_id')
  for (const p of ownedProjects) {
    await deleteProjectFully(p._id)
  }

  // 2. Remove user from projects where they are assigned (as programmer) but not owner
  await Project.updateMany(
    { assignedProgrammerId: userId },
    { $unset: { assignedProgrammerId: '' } }
  )
  await Project.updateMany(
    { assignedProgrammerIds: userId },
    { $pull: { assignedProgrammerIds: userId } }
  )
  await Project.updateMany(
    { readyConfirmedBy: userId },
    { $pull: { readyConfirmedBy: userId } }
  )

  // 3. Clear sub-step assignments (assignedTo) in ProjectPhase
  const userObjId = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId
  await ProjectPhase.updateMany(
    { 'subSteps.assignedTo': userObjId },
    { $unset: { 'subSteps.$[elem].assignedTo': '' } },
    { arrayFilters: [ { 'elem.assignedTo': userObjId } ] }
  )

  // 4. Remove user from Message.readBy
  await Message.updateMany(
    { readBy: userObjId },
    { $pull: { readBy: userObjId } }
  )

  // 5. Delete notifications for this user
  await Notification.deleteMany({ userId })

  // 6. Delete AIPreview records for this user
  await AIPreview.deleteMany({ userId })

  // 7. Delete support tickets for this user
  await SupportTicket.deleteMany({ userId })

  // 8. Delete avatar from GCS
  if (user.avatar && isGcsAvatar(user.avatar)) {
    await deleteAvatarFromGCS(user.avatar).catch((err) =>
      console.warn('GCS avatar delete failed:', err?.message)
    )
  }

  // 9. Delete the user
  await user.deleteOne()
}
