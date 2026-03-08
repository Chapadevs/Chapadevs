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
          assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
          },
          title: { type: String, required: true },
          completed: { type: Boolean, default: false },
          order: { type: Number, required: true },
          notes: { type: String, default: '' },
          status: {
            type: String,
            enum: ['pending', 'client_approval', 'in_progress', 'completed'],
            default: 'pending',
          },
          startDate: { type: Date, default: null },
          dueDate: { type: Date, default: null },
          completedAt: { type: Date, default: null },
          estimatedDurationDays: { type: Number, default: null },
          questionAnswers: {
            type: [
              {
                order: { type: Number, required: true },
                answer: { type: String, default: '' },
              },
            ],
            default: [],
          },
          todos: {
            type: [
              {
                text: { type: String, required: true },
                completed: { type: Boolean, default: false },
                order: { type: Number, required: true },
              },
            ],
            default: [],
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
                status: { type: String, enum: ['ok', 'changes_needed'], default: 'ok' },
                changesNeededFeedback: { type: String, default: null },
              },
            ],
            default: [],
          },
          requiredAttachments: {
            type: [
              {
                label: { type: String, required: true },
                description: { type: String, default: '' },
                order: { type: Number, default: 0 },
                receivedAt: { type: Date, default: null },
                minWidth: { type: Number, default: null },
                maxWidth: { type: Number, default: null },
                minHeight: { type: Number, default: null },
                maxHeight: { type: Number, default: null },
                allowedTypes: { type: [String], default: [] },
              },
            ],
            default: [],
          },
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
          subStepOrder: { type: Number, default: null },
          createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
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
    clientApprovalFeedback: {
      type: String,
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
          status: { type: String, enum: ['ok', 'changes_needed'], default: 'ok' },
          changesNeededFeedback: { type: String, default: null },
        },
      ],
      default: [],
    },
    requiredAttachments: {
      type: [
        {
          label: { type: String, required: true },
          description: { type: String, default: '' },
          order: { type: Number, default: 0 },
          receivedAt: { type: Date, default: null },
          minWidth: { type: Number, default: null },
          maxWidth: { type: Number, default: null },
          minHeight: { type: Number, default: null },
          maxHeight: { type: Number, default: null },
          allowedTypes: { type: [String], default: [] },
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
