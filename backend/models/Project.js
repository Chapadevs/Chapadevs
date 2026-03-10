import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a project title"],
      maxlength: 500,
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Please add a project description"],
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedProgrammerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedProgrammerIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    /** Project status: PascalCase for user-facing display (Holding, Open, Ready, etc.) */
    status: {
      type: String,
      enum: [
        "Holding",
        "Open",
        "Ready",
        "Development",
        "Completed",
        "Cancelled",
      ],
      default: "Holding",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    projectType: {
      type: String,
      enum: [
        "New Website Design & Development",
        "Website Redesign/Refresh",
        "E-commerce Store",
        "Management Panel / ERP / CRM",
        "Landing Page",
        "Web Application",
        "Maintenance/Updates to Existing Site",
        "Other",
      ],
      default: null,
    },
    timeline: {
      type: String,
      default: null,
    },
    goals: {
      type: [String],
      default: [],
    },
    features: {
      type: [String],
      default: [],
    },
    designStyles: {
      type: [String],
      default: [],
    },
    technologies: {
      type: [String],
      default: [],
    },
    hasBranding: {
      type: String,
      enum: ["Yes", "No", "Partial"],
      default: null,
    },
    brandingDetails: {
      type: String,
      default: null,
    },
    contentStatus: {
      type: String,
      default: null,
    },
    referenceWebsites: {
      type: String,
      default: null,
    },
    specialRequirements: {
      type: String,
      default: null,
    },
    additionalComments: {
      type: String,
      default: null,
    },
    attachments: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    startDate: {
      type: Date,
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    completedDate: {
      type: Date,
      default: null,
    },
    teamClosed: {
      type: Boolean,
      default: false,
    },
    /** Set by client when they have reviewed the project; programmers can then create steps and confirm ready */
    clientMarkedReady: {
      type: Boolean,
      default: false,
    },
    readyConfirmedBy: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    /** Persisted phase proposal before confirmation; used when project has no phases */
    phaseProposal: {
      type: [
        {
          title: { type: String, default: "" },
          description: { type: String, default: null },
          order: { type: Number, default: 0 },
          deliverables: { type: [String], default: [] },
          weeks: { type: Number, default: null },
          dueDate: { type: Date, default: null },
          subSteps: [
            {
              title: { type: String, default: "" },
              order: { type: Number, default: 0 },
              todos: [
                {
                  text: { type: String, default: "" },
                  order: { type: Number, default: 0 },
                },
              ],
            },
          ],
        },
      ],
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
projectSchema.index({ clientId: 1 });
projectSchema.index({ assignedProgrammerId: 1 });
projectSchema.index({ assignedProgrammerIds: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ clientId: 1, status: 1 });
projectSchema.index({ assignedProgrammerId: 1, status: 1 });
projectSchema.index({ createdAt: -1 });

const Project = mongoose.model("Project", projectSchema);

export default Project;
