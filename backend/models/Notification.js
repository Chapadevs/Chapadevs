import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    type: {
      type: String,
      enum: [
        'project_assigned',
        'project_updated',
        'project_completed',
        'project_accepted',
        'programmer_left',
        'removed_from_project',
        'message_received',
        'system',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 255,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

notificationSchema.index({ userId: 1 })
notificationSchema.index({ userId: 1, isRead: 1 })
notificationSchema.index({ projectId: 1 })
notificationSchema.index({ createdAt: -1 })

const Notification = mongoose.model('Notification', notificationSchema)

export default Notification