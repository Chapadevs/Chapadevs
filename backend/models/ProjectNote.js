import mongoose from 'mongoose'

const projectNoteSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  }
)

projectNoteSchema.index({ projectId: 1 })
projectNoteSchema.index({ userId: 1 })
projectNoteSchema.index({ createdAt: -1 })

const ProjectNote = mongoose.model('ProjectNote', projectNoteSchema)

export default ProjectNote