import mongoose from 'mongoose'

const aiPreviewSchema = new mongoose.Schema(
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
    prompt: {
      type: String,
      required: true,
    },
    previewResult: {
      type: String,
      default: '',
    },
    previewType: {
      type: String,
      enum: ['text', 'layout', 'design'],
      default: 'text',
    },
    status: {
      type: String,
      enum: ['generating', 'completed', 'failed'],
      default: 'generating',
    },
  },
  {
    timestamps: true,
  }
)

aiPreviewSchema.index({ userId: 1 })
aiPreviewSchema.index({ projectId: 1 })
aiPreviewSchema.index({ createdAt: -1 })

const AIPreview = mongoose.model('AIPreview', aiPreviewSchema)

export default AIPreview
