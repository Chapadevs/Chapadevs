import mongoose from 'mongoose'

const projectActivitySchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    targetType: {
      type: String,
      default: null,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

projectActivitySchema.index({ projectId: 1, createdAt: -1 })
projectActivitySchema.index({ actorId: 1, createdAt: -1 })

const ProjectActivity = mongoose.model('ProjectActivity', projectActivitySchema)

export default ProjectActivity
