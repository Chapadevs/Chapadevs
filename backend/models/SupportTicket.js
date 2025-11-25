import mongoose from 'mongoose'

const supportTicketSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: String,
      required: true,
      maxlength: 255,
    },
    message: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['technical', 'billing', 'general', 'feature_request', 'bug'],
      default: 'general',
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    adminResponse: {
      type: String,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

supportTicketSchema.index({ userId: 1 })
supportTicketSchema.index({ status: 1 })
supportTicketSchema.index({ createdAt: -1 })

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema)

export default SupportTicket
