import asyncHandler from "express-async-handler";
import IdeaSet from "../models/IdeaSet.js";
import vertexAIService from "../services/vertexAI/index.js";

const PROJECT_TYPES = [
  "New Website Design & Development",
  "Website Redesign/Refresh",
  "E-commerce Store",
  "Management Panel / ERP / CRM",
  "Landing Page",
  "Web Application",
  "Maintenance/Updates to Existing Site",
  "Other",
];

const ALLOWED_TECH = [
  "React",
  "Angular",
  "Node.js",
  "Express",
  "MongoDB",
  "PostgreSQL",
  "TypeScript",
  "Next.js",
  "Tailwind CSS",
];

const CLIENT_ROLES = new Set(["user", "client"]);

function isClientIdeasAccount(user) {
  return Boolean(user && CLIENT_ROLES.has(user.role));
}

function normalizeIdea(raw, index) {
  const key = typeof raw.key === "string" && raw.key.trim() ? raw.key.trim() : `idea-${index}`;
  const title =
    typeof raw.title === "string" && raw.title.trim()
      ? raw.title.trim().slice(0, 200)
      : `Website direction ${index + 1}`;
  const summary =
    typeof raw.summary === "string" ? raw.summary.trim().slice(0, 220) : "";
  const whoItFits =
    typeof raw.whoItFits === "string" ? raw.whoItFits.trim().slice(0, 180) : "";

  const toStrArr = (v, max, maxLen) => {
    if (!Array.isArray(v)) return [];
    return v
      .map((x) => (typeof x === "string" ? x.trim() : String(x)))
      .filter(Boolean)
      .slice(0, max)
      .map((s) => s.slice(0, maxLen));
  };

  const suggestedPages = toStrArr(raw.suggestedPages, 6, 40);
  const keyFeatures = toStrArr(raw.keyFeatures, 4, 80);

  const pd = raw.previewDirection && typeof raw.previewDirection === "object"
    ? raw.previewDirection
    : {};
  const previewDirection = {
    visualStyle:
      typeof pd.visualStyle === "string"
        ? pd.visualStyle.trim().slice(0, 80)
        : "",
    layoutVibe:
      typeof pd.layoutVibe === "string" ? pd.layoutVibe.trim().slice(0, 90) : "",
    homepageConcept:
      typeof pd.homepageConcept === "string"
        ? pd.homepageConcept.trim().slice(0, 160)
        : "",
  };

  let suggestedProjectType =
    typeof raw.suggestedProjectType === "string"
      ? raw.suggestedProjectType.trim()
      : "";
  if (!PROJECT_TYPES.includes(suggestedProjectType)) {
    suggestedProjectType = "New Website Design & Development";
  }

  let tech = [];
  if (Array.isArray(raw.suggestedTechnologies)) {
    tech = raw.suggestedTechnologies
      .map((t) => (typeof t === "string" ? t.trim() : ""))
      .filter((t) => ALLOWED_TECH.includes(t));
  }
  if (tech.length === 0) {
    tech = ["React", "TypeScript", "Tailwind CSS", "Node.js"];
  }

  return {
    key,
    title,
    summary,
    whoItFits,
    suggestedPages,
    keyFeatures,
    previewDirection,
    suggestedProjectType,
    suggestedTechnologies: [...new Set(tech)].slice(0, 8),
  };
}

function normalizeIdeasResult(result) {
  const list = Array.isArray(result?.ideas) ? result.ideas : [];
  const normalized = list.slice(0, 5).map((item, i) => normalizeIdea(item, i));
  while (normalized.length < 3) {
    normalized.push(
      normalizeIdea(
        {
          title: `Direction ${normalized.length + 1}`,
          summary: "A flexible website approach based on your description.",
          whoItFits: "Pick this if you need a clear next step without overbuilding.",
          suggestedPages: ["Home", "Offer", "Contact"],
          keyFeatures: ["Clearer customer path", "Simple scope to ship fast"],
          previewDirection: {
            visualStyle: "Modern, approachable",
            layoutVibe: "Short path to action",
            homepageConcept: "People quickly understand the offer and what to do next.",
          },
          suggestedProjectType: "New Website Design & Development",
          suggestedTechnologies: ["React", "TypeScript", "Tailwind CSS"],
        },
        normalized.length,
      ),
    );
  }
  return normalized.slice(0, 5);
}

// POST /api/ideas/generate — public; saves when authenticated as a client account
export const generateIdeas = asyncHandler(async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    res.status(400);
    throw new Error("Please describe your business or website needs");
  }

  const trimmed = prompt.trim().slice(0, 8000);
  const { result, fromCache, usage } =
    await vertexAIService.generateWebsiteIdeas(trimmed);
  const ideas = normalizeIdeasResult(result);

  let ideaSetId = null;
  const user = req.user;
  if (isClientIdeasAccount(user)) {
    const doc = await IdeaSet.create({
      clientId: user._id,
      sourcePrompt: trimmed,
      ideas,
    });
    ideaSetId = doc._id.toString();
  }

  res.status(200).json({
    ideas,
    ideaSetId,
    fromCache: fromCache === true,
    tokenUsage: usage?.totalTokenCount ?? null,
  });
});

// GET /api/ideas — list current user's idea sets
export const listMyIdeaSets = asyncHandler(async (req, res) => {
  if (!isClientIdeasAccount(req.user)) {
    res.status(403);
    throw new Error("Only client accounts have saved website ideas");
  }
  const sets = await IdeaSet.find({ clientId: req.user._id })
    .sort({ createdAt: -1 })
    .select("sourcePrompt ideas createdAt updatedAt")
    .lean();

  res.json(
    sets.map((s) => ({
      id: s._id.toString(),
      sourcePrompt: s.sourcePrompt,
      ideaCount: Array.isArray(s.ideas) ? s.ideas.length : 0,
      previewTitles: (s.ideas || []).slice(0, 3).map((i) => i.title),
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
  );
});

// GET /api/ideas/:id — one set (owner only)
export const getIdeaSetById = asyncHandler(async (req, res) => {
  if (!isClientIdeasAccount(req.user)) {
    res.status(403);
    throw new Error("Not authorized");
  }
  const doc = await IdeaSet.findOne({
    _id: req.params.id,
    clientId: req.user._id,
  }).lean();

  if (!doc) {
    res.status(404);
    throw new Error("Idea set not found");
  }

  res.json({
    id: doc._id.toString(),
    sourcePrompt: doc.sourcePrompt,
    ideas: doc.ideas || [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
});
