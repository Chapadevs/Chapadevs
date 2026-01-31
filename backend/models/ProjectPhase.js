import mongoose from 'mongoose'

const projectPhaseSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
    },
    completedAt: {
      type: Date,
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    deliverables: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

projectPhaseSchema.index({ projectId: 1 })
projectPhaseSchema.index({ projectId: 1, order: 1 })

const ProjectPhase = mongoose.model('ProjectPhase', projectPhaseSchema)

export default ProjectPhase
