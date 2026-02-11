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
    estimatedDurationDays: {
      type: Number,
      default: null,
    },
    actualDurationDays: {
      type: Number,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    subSteps: {
      type: [
        {
          title: { type: String, required: true },
          completed: { type: Boolean, default: false },
          order: { type: Number, required: true },
          notes: { type: String, default: '' },
        },
      ],
      default: [],
    },
    clientQuestions: {
      type: [
        {
          question: { type: String, required: true },
          answer: { type: String, default: '' },
          required: { type: Boolean, default: false },
          order: { type: Number, required: true },
        },
      ],
      default: [],
    },
    requiresClientApproval: {
      type: Boolean,
      default: false,
    },
    clientApproved: {
      type: Boolean,
      default: false,
    },
    clientApprovedAt: {
      type: Date,
      default: null,
    },
    attachments: {
      type: [
        {
          filename: { type: String, required: true },
          url: { type: String, required: true },
          uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
          },
          uploadedAt: { type: Date, default: Date.now },
          type: { type: String, default: 'file' },
        },
      ],
      default: [],
    },
    notes: {
      type: String,
      default: '',
    },
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProjectPhase',
      default: null,
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
