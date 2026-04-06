import mongoose from "mongoose";

const previewDirectionSchema = new mongoose.Schema(
  {
    visualStyle: { type: String, default: "" },
    layoutVibe: { type: String, default: "" },
    homepageConcept: { type: String, default: "" },
  },
  { _id: false },
);

const ideaItemSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    summary: { type: String, default: "" },
    whoItFits: { type: String, default: "" },
    suggestedPages: { type: [String], default: [] },
    keyFeatures: { type: [String], default: [] },
    previewDirection: { type: previewDirectionSchema, default: () => ({}) },
    suggestedProjectType: { type: String, default: "" },
    suggestedTechnologies: { type: [String], default: [] },
  },
  { _id: false },
);

const ideaSetSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sourcePrompt: {
      type: String,
      required: true,
      maxlength: 8000,
    },
    ideas: {
      type: [ideaItemSchema],
      default: [],
    },
  },
  { timestamps: true },
);

ideaSetSchema.index({ clientId: 1, createdAt: -1 });

const IdeaSet = mongoose.model("IdeaSet", ideaSetSchema);

export default IdeaSet;
