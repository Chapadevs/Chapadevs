import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      default: '',
      maxlength: 5000,
      trim: true,
    },
    attachments: {
      type: [
        {
          url: { type: String, required: true },
          filename: { type: String, required: true },
          type: { type: String, default: 'file' },
        },
      ],
      default: [],
    },
    readBy: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
messageSchema.index({ projectId: 1, createdAt: -1 })
messageSchema.index({ senderId: 1 })

const Message = mongoose.model('Message', messageSchema)

export default Message
