import AIPreview from "../models/AIPreview.js";
import Project from "../models/Project.js";
import User from "../models/User.js";
import { logProjectActivity } from "../utils/activityLogger.js";
import asyncHandler from "express-async-handler";
import vertexAIService from "../services/vertexAI/index.js";
import { resolveTemplateType } from "../services/vertexAI/templateStructureHelper.js";
import { generateImagesForPreview } from "../services/vertexAI/imageGeneration.js";
import {
  injectGeneratedImages,
  normalizePreviewMetadata,
  ensureRequiredFiles,
} from "../services/vertexAI/responseParser.js";
import { buildDefineFiles } from "../utils/codesandboxDefine.js";
import { resizeImagesForCodesandbox } from "../utils/resizeImagesForCodesandbox.js";
import {
  uploadBase64ImagesToGCS,
  getSignedUrlsForPaths,
  buildImageUrlsForInjection,
} from "../utils/gcsImageStorage.js";
import costMonitor from "../middleware/costMonitoring.js";

const ESTIMATED_TOKENS_PER_REQUEST = 20000;

// @desc    Generate AI preview
// @route   POST /api/ai-previews
// @access  Private
export const generateAIPreview = asyncHandler(async (req, res) => {
  const {
    prompt,
    projectId,
    previewType,
    timeline,
    techStack,
    projectType,
    previewTemplate,
    modelId,
  } = req.body;

  if (!prompt) {
    res.status(400);
    throw new Error("Please provide a prompt for the AI preview");
  }

  // Track request
  costMonitor.trackRequest();

  // Rate limiting: Check user's recent requests
  const oneHourAgo = new Date(Date.now() - 3600000);
  const recentPreviews = await AIPreview.countDocuments({
    userId: req.user._id,
    createdAt: { $gte: oneHourAgo },
  });

  if (projectId) {
    const project = await Project.findById(projectId);
    if (!project || project.clientId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Not authorized to generate preview for this project");
    }
    // Per-project limit: max 5 completed previews per project
    const projectPreviewCount = await AIPreview.countDocuments({
      projectId,
      status: "completed",
    });
    if (projectPreviewCount >= 3) {
      res.status(400);
      throw new Error(
        "This project already has 3 AI previews. Delete one to generate another.",
      );
    }
  }

  const selectedModelId = modelId || "gemini-2.5-pro";
  const { type: templateType, source: templateSource } = resolveTemplateType(
    projectType,
    prompt,
    previewTemplate,
  );

  // CREATES THE PREVIEW RECORD: userId, projectId, prompt, previewType, previewResult, status, metadata
  const preview = await AIPreview.create({
    userId: req.user._id,
    projectId: projectId || null,
    prompt,
    previewType: previewType || "text",
    previewResult: "",
    status: "generating",
    metadata: {
      timeline,
      techStack,
      projectType,
      previewTemplate,
      modelId: selectedModelId,
    },
  });

  console.log(
    "[AI Preview] Generation params:",
    JSON.stringify(
      {
        previewId: preview._id.toString(),
        prompt: prompt.substring(0, 200) + (prompt.length > 200 ? "..." : ""),
        promptLength: prompt.length,
        userInputs: { timeline, techStack, projectType, previewTemplate },
        templateType,
        templateSource,
        modelId: selectedModelId,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  try {
    const userInputs = { timeline, techStack, projectType, previewTemplate };

    // Use combined preview generation (single API call)
    const { result, fromCache, usage, isMock } =
      await vertexAIService.generateCombinedPreview(
        prompt,
        userInputs,
        selectedModelId,
      );

    if (fromCache) {
      costMonitor.trackCacheHit();
    } else if (!isMock) {
      costMonitor.trackAPICall();
    }

    // Extract analysis, code (always set for display/legacy), and optional files from combined result
    let analysis = result.analysis || {};
    let code = result.code || "";
    let files =
      result.files && typeof result.files === "object" ? result.files : null;
    if (files) ensureRequiredFiles(files); // Add ContactPage.js if AI omitted it but App imports it

    // Generate exactly 3 images: logo, hero, display. Preview card thumbnail = display.
    let dataUrls = [];
    if (
      process.env.GCP_PROJECT_ID &&
      process.env.ENABLE_GEMINI_IMAGE_GEN !== "false" &&
      (code || files)
    ) {
      try {
        dataUrls = await generateImagesForPreview(analysis, prompt, 3);
      } catch (imgErr) {
        console.warn("Preview image generation skipped:", imgErr.message);
      }
    }
    let urlsForResponse = dataUrls;
    let metadataImageFields = {};
    if (dataUrls.length > 0) {
      const slotPaths = await uploadBase64ImagesToGCS(
        dataUrls,
        preview._id.toString(),
      );
      const uploadedPaths = slotPaths.filter(Boolean);
      if (uploadedPaths.length > 0) {
        const thumbnailPath =
          slotPaths[2] || slotPaths[1] || slotPaths[0] || uploadedPaths[0];
        metadataImageFields = {
          generatedImageGcsPaths: slotPaths,
          previewThumbnailGcsPath: thumbnailPath,
        };
        urlsForResponse = await buildImageUrlsForInjection(
          dataUrls,
          slotPaths,
          3600000,
        );
      } else {
        const thumbnailIdx =
          dataUrls.length >= 3 ? 2 : dataUrls.length > 1 ? 1 : 0; // Prefer display (2), then hero (1), then logo (0)
        const thumbnailUrl =
          dataUrls[thumbnailIdx] &&
          dataUrls[thumbnailIdx].startsWith("data:image/")
            ? dataUrls[thumbnailIdx]
            : dataUrls.find((u) => u && u.startsWith("data:image/")) || null;
        metadataImageFields = {
          generatedImageUrls: dataUrls,
          ...(thumbnailUrl && { previewThumbnailUrl: thumbnailUrl }),
        };
      }
    }
    const injected = injectGeneratedImages(code, files, urlsForResponse);

    // Convert analysis to JSON string for storage
    const analysisJson = JSON.stringify(analysis);

    const totalTokenCount = usage?.totalTokenCount ?? 0;
    const estimatedTokens =
      totalTokenCount > 0
        ? totalTokenCount
        : Math.ceil(analysisJson.length / 4) +
          Math.ceil((code || "").length / 4);

    preview.previewResult = analysisJson;
    preview.status = "completed";
    preview.tokenUsage = estimatedTokens;
    preview.metadata = {
      ...preview.metadata,
      websitePreviewCode: code,
      ...(files && { websitePreviewFiles: files }),
      ...metadataImageFields,
      generationParams: {
        templateType,
        templateSource,
        previewTemplate: previewTemplate || null,
        promptPreview: prompt.substring(0, 300),
        userInputs: { timeline, techStack, projectType },
        modelId: selectedModelId,
      },
      usage: usage
        ? {
            combined: {
              promptTokenCount: usage.promptTokenCount || 0,
              candidatesTokenCount: usage.candidatesTokenCount || 0,
              totalTokenCount: usage.totalTokenCount || 0,
            },
          }
        : null,
    };
    await preview.save();
    if (preview.projectId) {
      await logProjectActivity(
        preview.projectId,
        req.user._id,
        "preview.generated",
        "preview",
        preview._id,
        {},
      );
    }
    try {
      await createAndCacheCodesandbox(preview);
    } catch (_) {
      // Helper logs internally; generation success not blocked
    }

    const usagePayload = {
      combined: usage,
      totalTokenCount: estimatedTokens,
    };

    res.status(201).json({
      id: preview._id,
      prompt: preview.prompt,
      previewType: preview.previewType,
      status: "completed",
      result: analysis,
      websitePreview: injected.code
        ? { htmlCode: injected.code, isMock: isMock === true }
        : null,
      ...(injected.files && { websitePreviewFiles: injected.files }),
      fromCache: fromCache === true,
      websiteIsMock: isMock === true,
      tokenUsage: estimatedTokens,
      usage: usagePayload,
      message: fromCache
        ? "Results retrieved from cache"
        : "AI preview generated successfully",
    });
  } catch (error) {
    costMonitor.trackError();

    // Update preview with error
    preview.status = "failed";
    preview.previewResult = error.message;
    await preview.save();

    res.status(500);
    throw new Error(`AI generation failed: ${error.message}`);
  }
});

/** Send SSE event (newline-delimited JSON). */
function sendSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * Create CodeSandbox sandbox for a preview and cache URLs in metadata.
 * Does not throw; logs errors so generation success is not blocked.
 * Resizes images to stay under CodeSandbox 20MB limit; falls back to placeholders if resize fails.
 * @param {import('../models/AIPreview.js').default} preview - Saved preview document with metadata
 */
async function createAndCacheCodesandbox(preview) {
  if (preview.metadata?.codesandboxEmbedUrl) return;
  normalizePreviewMetadata(preview.metadata);
  let meta = preview.metadata;
  let urlsForPayload = [];
  const gcsPaths = meta?.generatedImageGcsPaths;
  if (gcsPaths?.length === 3) {
    urlsForPayload = await buildImageUrlsForInjection([], gcsPaths, 604800000);
  } else if (gcsPaths?.length) {
    urlsForPayload = await getSignedUrlsForPaths(
      gcsPaths.filter(Boolean),
      604800000,
    );
  } else if (meta?.generatedImageUrls?.length) {
    try {
      urlsForPayload = await resizeImagesForCodesandbox(
        meta.generatedImageUrls,
      );
    } catch (_) {}
  }
  const injected = injectGeneratedImages(
    meta.websitePreviewCode,
    meta.websitePreviewFiles,
    urlsForPayload,
  );
  meta = {
    ...meta,
    websitePreviewCode: injected.code,
    websitePreviewFiles: injected.files,
  };
  const files = buildDefineFiles(meta);
  if (!files["/App.js"]?.content) {
    console.warn("CodeSandbox skip: preview has no App code", preview._id);
    return;
  }
  try {
    const filesForApi = Object.fromEntries(
      Object.entries(files).map(([path, value]) => [
        path.replace(/^\//, ""),
        value,
      ]),
    );
    const response = await fetch(
      "https://codesandbox.io/api/v1/sandboxes/define?json=1",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: filesForApi }),
        redirect: "follow",
      },
    );
    if (!response.ok) {
      const text = await response.text();
      console.warn(
        "CodeSandbox define failed:",
        response.status,
        text?.slice(0, 300),
      );
      return;
    }
    const data = await response.json();
    const sandboxId = data.sandbox_id || data.sandboxId;
    if (!sandboxId) {
      console.warn(
        "CodeSandbox define: no sandbox id in response",
        preview._id,
      );
      return;
    }
    preview.metadata = {
      ...preview.metadata,
      codesandboxSandboxId: sandboxId,
      codesandboxEmbedUrl: `https://codesandbox.io/embed/${sandboxId}?view=preview&hidenavigation=1`,
      codesandboxEditorUrl: `https://codesandbox.io/s/${sandboxId}`,
    };
    await preview.save();
  } catch (err) {
    console.warn(
      "CodeSandbox createAndCache error:",
      err.message,
      "previewId:",
      preview._id,
    );
  }
}

// @desc    Generate AI preview with streaming (real-time thinking in form area)
// @route   POST /api/ai-previews/stream
// @access  Private
export const generateAIPreviewStream = asyncHandler(async (req, res) => {
  const {
    prompt,
    projectId,
    previewType,
    timeline,
    techStack,
    projectType,
    previewTemplate,
    modelId,
  } = req.body;

  if (!prompt) {
    res
      .status(400)
      .json({ error: "Please provide a prompt for the AI preview" });
    return;
  }

  costMonitor.trackRequest();

  const oneHourAgo = new Date(Date.now() - 3600000);
  const recentPreviews = await AIPreview.countDocuments({
    userId: req.user._id,
    createdAt: { $gte: oneHourAgo },
  });

  if (projectId) {
    const project = await Project.findById(projectId);
    if (!project || project.clientId.toString() !== req.user._id.toString()) {
      res
        .status(403)
        .json({ error: "Not authorized to generate preview for this project" });
      return;
    }
    const projectPreviewCount = await AIPreview.countDocuments({
      projectId,
      status: "completed",
    });
    if (projectPreviewCount >= 3) {
      res
        .status(400)
        .json({
          error:
            "This project already has 3 AI previews. Delete one to generate another.",
        });
      return;
    }
  }

  const selectedModelId = modelId || "gemini-2.5-pro";
  const { type: templateType, source: templateSource } = resolveTemplateType(
    projectType,
    prompt,
    previewTemplate,
  );

  const preview = await AIPreview.create({
    userId: req.user._id,
    projectId: projectId || null,
    prompt,
    previewType: previewType || "text",
    previewResult: "",
    status: "generating",
    metadata: {
      timeline,
      techStack,
      projectType,
      previewTemplate,
      modelId: selectedModelId,
    },
  });

  console.log(
    "[AI Preview] Generation params:",
    JSON.stringify(
      {
        previewId: preview._id.toString(),
        prompt: prompt.substring(0, 200) + (prompt.length > 200 ? "..." : ""),
        promptLength: prompt.length,
        userInputs: { timeline, techStack, projectType, previewTemplate },
        templateType,
        templateSource,
        modelId: selectedModelId,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  sendSSE(res, { type: "start", previewId: preview._id.toString() });

  try {
    const userInputs = { timeline, techStack, projectType, previewTemplate };
    const { result, usage } =
      await vertexAIService.generateCombinedPreviewStream(
        prompt,
        userInputs,
        selectedModelId,
        (text) => sendSSE(res, { type: "chunk", text }),
      );

    if (!result) {
      preview.status = "failed";
      preview.previewResult = "No result from AI";
      await preview.save();
      sendSSE(res, { type: "error", message: "No result from AI" });
      res.end();
      return;
    }

    let analysis = result.analysis || {};
    let code = result.code || "";
    let files =
      result.files && typeof result.files === "object" ? result.files : null;
    if (files) ensureRequiredFiles(files);

    let dataUrls = [];
    if (
      process.env.GCP_PROJECT_ID &&
      process.env.ENABLE_GEMINI_IMAGE_GEN !== "false" &&
      (code || files)
    ) {
      try {
        dataUrls = await generateImagesForPreview(analysis, prompt, 3);
      } catch (imgErr) {
        console.warn("Preview image generation skipped:", imgErr.message);
      }
    }
    let metadataImageFields = {};
    if (dataUrls.length > 0) {
      const slotPaths = await uploadBase64ImagesToGCS(
        dataUrls,
        preview._id.toString(),
      );
      const uploadedPaths = slotPaths.filter(Boolean);
      if (uploadedPaths.length > 0) {
        const thumbnailPath =
          slotPaths[2] || slotPaths[1] || slotPaths[0] || uploadedPaths[0];
        metadataImageFields = {
          generatedImageGcsPaths: slotPaths,
          previewThumbnailGcsPath: thumbnailPath,
        };
      } else {
        const thumbnailIdx =
          dataUrls.length >= 3 ? 2 : dataUrls.length > 1 ? 1 : 0; // Prefer display (2), then hero (1), then logo (0)
        const thumbnailUrl =
          dataUrls[thumbnailIdx] &&
          dataUrls[thumbnailIdx].startsWith("data:image/")
            ? dataUrls[thumbnailIdx]
            : dataUrls.find((u) => u && u.startsWith("data:image/")) || null;
        metadataImageFields = {
          generatedImageUrls: dataUrls,
          ...(thumbnailUrl && { previewThumbnailUrl: thumbnailUrl }),
        };
      }
    }
    const analysisJson = JSON.stringify(analysis);
    const estimatedTokens =
      usage?.totalTokenCount ??
      Math.ceil(analysisJson.length / 4) + Math.ceil((code || "").length / 4);

    preview.previewResult = analysisJson;
    preview.status = "completed";
    preview.tokenUsage = estimatedTokens;
    preview.metadata = {
      ...preview.metadata,
      websitePreviewCode: code,
      ...(files && { websitePreviewFiles: files }),
      ...metadataImageFields,
      generationParams: {
        templateType,
        templateSource,
        previewTemplate: previewTemplate || null,
        promptPreview: prompt.substring(0, 300),
        userInputs: { timeline, techStack, projectType },
        modelId: selectedModelId,
      },
      usage: usage
        ? {
            combined: {
              promptTokenCount: usage.promptTokenCount || 0,
              candidatesTokenCount: usage.candidatesTokenCount || 0,
              totalTokenCount: usage.totalTokenCount || 0,
            },
          }
        : null,
    };
    await preview.save();
    if (preview.projectId) {
      await logProjectActivity(
        preview.projectId,
        req.user._id,
        "preview.generated",
        "preview",
        preview._id,
        {},
      );
    }
    createAndCacheCodesandbox(preview).catch(() => {});

    if (!usage) costMonitor.trackCacheHit();
    else costMonitor.trackAPICall();

    sendSSE(res, {
      type: "done",
      previewId: preview._id.toString(),
      status: "completed",
      result: analysis,
      tokenUsage: estimatedTokens,
    });
  } catch (error) {
    costMonitor.trackError();
    // Send SSE error first so client gets the message; do not rethrow so error middleware is not invoked
    try {
      sendSSE(res, {
        type: "error",
        message: error.message || "AI generation failed",
      });
    } catch (_) {
      /* client may have disconnected */
    }
    preview.status = "failed";
    preview.previewResult = error.message;
    preview
      .save()
      .catch((saveErr) =>
        console.error("AI preview save failed:", saveErr.message),
      );
  }

  res.end();
});

// @desc    Get AI usage for current user
// @route   GET /api/ai-previews/usage
// @access  Private
export const getAIPreviewUsage = asyncHandler(async (req, res) => {
  const period = (req.query.period || "month").toLowerCase();
  const isWeek = period === "week";
  const start = new Date();
  if (isWeek) start.setDate(start.getDate() - 7);
  else start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const previews = await AIPreview.find({
    userId: req.user._id,
    status: "completed",
    createdAt: { $gte: start },
  })
    .select("tokenUsage metadata.usage createdAt")
    .sort({ createdAt: -1 })
    .lean();

  const totalRequests = previews.length;
  const totalTokenCount = previews.reduce(
    (sum, p) => sum + (p.tokenUsage || 0),
    0,
  );
  let totalPromptTokens = 0;
  let totalOutputTokens = 0;
  for (const p of previews) {
    const u = p.metadata?.usage;
    if (u?.analysis) {
      totalPromptTokens += u.analysis.promptTokenCount || 0;
      totalOutputTokens += u.analysis.candidatesTokenCount || 0;
    }
    if (u?.website) {
      totalPromptTokens += u.website.promptTokenCount || 0;
      totalOutputTokens += u.website.candidatesTokenCount || 0;
    }
  }

  res.json({
    period: isWeek ? "week" : "month",
    totalRequests,
    totalTokenCount,
    totalPromptTokens,
    totalOutputTokens,
    byPreview: previews.map((p) => ({
      id: p._id,
      createdAt: p.createdAt,
      tokenUsage: p.tokenUsage,
    })),
  });
});

// @desc    Get all AI previews for current user
// @route   GET /api/ai-previews
// @access  Private
export const getAIPreviews = asyncHandler(async (req, res) => {
  const previews = await AIPreview.find({ userId: req.user._id })
    .populate("projectId", "title status")
    .sort({ createdAt: -1 });

  for (const p of previews) {
    normalizePreviewMetadata(p.metadata);
    let urlsForInject = [];
    const gcsPaths = p.metadata?.generatedImageGcsPaths;
    if (gcsPaths?.length === 3) {
      urlsForInject = await buildImageUrlsForInjection([], gcsPaths, 3600000);
      const valid = urlsForInject.filter(
        (u) => u && u.includes("storage.googleapis.com"),
      );
      if (valid.length > 0)
        p.metadata.previewThumbnailUrl = valid[2] || valid[1] || valid[0];
    } else if (gcsPaths?.length) {
      urlsForInject = await getSignedUrlsForPaths(
        gcsPaths.filter(Boolean),
        3600000,
      );
      if (urlsForInject.length > 0)
        p.metadata.previewThumbnailUrl =
          urlsForInject[2] || urlsForInject[1] || urlsForInject[0];
    } else if (p.metadata?.generatedImageUrls?.length) {
      urlsForInject = p.metadata.generatedImageUrls;
    }
    if (urlsForInject.length > 0) {
      const inj = injectGeneratedImages(
        p.metadata.websitePreviewCode,
        p.metadata.websitePreviewFiles,
        urlsForInject,
      );
      p.metadata.websitePreviewCode = inj.code;
      if (inj.files) p.metadata.websitePreviewFiles = inj.files;
    }
  }
  res.json(previews);
});

// @desc    Get AI preview by ID
// @route   GET /api/ai-previews/:id
// @access  Private
export const getAIPreviewById = asyncHandler(async (req, res) => {
  const preview = await AIPreview.findById(req.params.id).populate(
    "projectId",
    "title status",
  );

  if (!preview) {
    res.status(404);
    throw new Error("AI preview not found");
  }

  if (
    preview.userId.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    res.status(403);
    throw new Error("Not authorized to view this preview");
  }

  normalizePreviewMetadata(preview.metadata);
  let urlsForInject = [];
  if (preview.metadata?.generatedImageGcsPaths?.length) {
    urlsForInject = await getSignedUrlsForPaths(
      preview.metadata.generatedImageGcsPaths,
      3600000,
    );
    if (urlsForInject.length > 0) {
      preview.metadata.previewThumbnailUrl =
        urlsForInject[2] || urlsForInject[1] || urlsForInject[0];
    }
  } else if (preview.metadata?.generatedImageUrls?.length) {
    urlsForInject = preview.metadata.generatedImageUrls;
  }
  if (urlsForInject.length > 0) {
    const inj = injectGeneratedImages(
      preview.metadata.websitePreviewCode,
      preview.metadata.websitePreviewFiles,
      urlsForInject,
    );
    preview.metadata.websitePreviewCode = inj.code;
    if (inj.files) preview.metadata.websitePreviewFiles = inj.files;
  }
  res.json(preview);
});

// @desc    Get CodeSandbox embed URL for preview (create sandbox via define API if not cached)
// @route   GET /api/ai-previews/:id/codesandbox-embed
// @access  Private
export const getCodesandboxEmbed = asyncHandler(async (req, res) => {
  const preview = await AIPreview.findById(req.params.id);

  if (!preview) {
    res.status(404);
    throw new Error("AI preview not found");
  }

  if (
    preview.userId.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    res.status(403);
    throw new Error("Not authorized to view this preview");
  }

  const cached = preview.metadata?.codesandboxEmbedUrl;
  if (cached) {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.json({
      embedUrl: preview.metadata.codesandboxEmbedUrl,
      editorUrl:
        preview.metadata.codesandboxEditorUrl ||
        `https://codesandbox.io/s/${preview.metadata.codesandboxSandboxId}`,
      sandboxId: preview.metadata.codesandboxSandboxId,
    });
  }

  normalizePreviewMetadata(preview.metadata);

  let meta = preview.metadata;
  let urlsForPayload = [];
  const gcsPaths = meta?.generatedImageGcsPaths;
  if (gcsPaths?.length === 3) {
    urlsForPayload = await buildImageUrlsForInjection([], gcsPaths, 604800000);
  } else if (gcsPaths?.length) {
    urlsForPayload = await getSignedUrlsForPaths(
      gcsPaths.filter(Boolean),
      604800000,
    );
  } else if (meta?.generatedImageUrls?.length) {
    try {
      urlsForPayload = await resizeImagesForCodesandbox(
        meta.generatedImageUrls,
      );
    } catch (_) {}
  }
  const injected = injectGeneratedImages(
    meta.websitePreviewCode,
    meta.websitePreviewFiles,
    urlsForPayload,
  );
  meta = {
    ...meta,
    websitePreviewCode: injected.code,
    websitePreviewFiles: injected.files,
  };
  const files = buildDefineFiles(meta);
  if (!files["/App.js"]?.content) {
    res.status(400);
    throw new Error("Preview has no App code to embed");
  }

  try {
    const filesForApi = Object.fromEntries(
      Object.entries(files).map(([path, value]) => [
        path.replace(/^\//, ""),
        value,
      ]),
    );
    const response = await fetch(
      "https://codesandbox.io/api/v1/sandboxes/define?json=1",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: filesForApi }),
        redirect: "follow",
      },
    );
    if (!response.ok) {
      const text = await response.text();
      console.error(
        "CodeSandbox define API failed:",
        response.status,
        text?.slice(0, 500),
      );
      throw new Error(`CodeSandbox define failed: ${response.status} ${text}`);
    }

    const data = await response.json();
    const sandboxId = data.sandbox_id || data.sandboxId;
    if (!sandboxId) {
      throw new Error("CodeSandbox did not return a sandbox id");
    }

    const embedUrl = `https://codesandbox.io/embed/${sandboxId}?view=preview&hidenavigation=1`;
    const editorUrl = `https://codesandbox.io/s/${sandboxId}`;

    preview.metadata = {
      ...preview.metadata,
      codesandboxSandboxId: sandboxId,
      codesandboxEmbedUrl: embedUrl,
      codesandboxEditorUrl: editorUrl,
    };
    await preview.save();

    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.json({ embedUrl, editorUrl, sandboxId });
  } catch (err) {
    console.error(
      "CodeSandbox embed error:",
      err.message,
      "previewId:",
      req.params.id,
    );
    res.status(502);
    throw new Error(err.message || "Failed to create CodeSandbox preview");
  }
});

// @desc    Delete AI preview
// @route   DELETE /api/ai-previews/:id
// @access  Private
export const deleteAIPreview = asyncHandler(async (req, res) => {
  const preview = await AIPreview.findById(req.params.id);

  if (!preview) {
    res.status(404);
    throw new Error("AI preview not found");
  }

  if (
    preview.userId.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    res.status(403);
    throw new Error("Not authorized to delete this preview");
  }

  await preview.deleteOne();

  res.json({ message: "AI preview deleted successfully" });
});

// @desc    Regenerate AI preview with styling modifications
// @route   POST /api/ai-previews/:id/regenerate
// @access  Private
export const regenerateAIPreview = asyncHandler(async (req, res) => {
  const { modifications, modelId } = req.body;

  const preview = await AIPreview.findById(req.params.id);

  if (!preview) {
    res.status(404);
    throw new Error("AI preview not found");
  }

  if (
    preview.userId.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    res.status(403);
    throw new Error("Not authorized to regenerate this preview");
  }

  if (preview.status !== "completed") {
    res.status(400);
    throw new Error("Can only regenerate completed previews");
  }

  // Get cached code from metadata
  const cachedCode = preview.metadata?.websitePreviewCode;
  if (!cachedCode) {
    res.status(400);
    throw new Error("No cached code found for regeneration");
  }

  const selectedModelId = modelId || "gemini-2.5-pro";

  try {
    const { htmlCode, usage } = await vertexAIService.regenerateWithContext(
      cachedCode,
      modifications ||
        "Change color scheme and adjust spacing for a fresh look",
      selectedModelId,
    );

    if (!usage) {
      costMonitor.trackCacheHit();
    } else {
      costMonitor.trackAPICall();
    }

    // Update preview with new code; clear CodeSandbox cache so next embed creates new sandbox
    const meta = { ...(preview.metadata || {}) };
    delete meta.codesandboxSandboxId;
    delete meta.codesandboxEmbedUrl;
    delete meta.codesandboxEditorUrl;
    preview.metadata = {
      ...meta,
      websitePreviewCode: htmlCode,
      modelId: selectedModelId,
      lastRegenerated: new Date(),
    };

    const tokenUsage = usage?.totalTokenCount ?? Math.ceil(htmlCode.length / 4);
    preview.tokenUsage = (preview.tokenUsage || 0) + tokenUsage;
    await preview.save();

    res.status(200).json({
      id: preview._id,
      websitePreview: { htmlCode, isMock: false },
      tokenUsage: tokenUsage,
      usage: usage
        ? {
            regenerate: {
              promptTokenCount: usage.promptTokenCount || 0,
              candidatesTokenCount: usage.candidatesTokenCount || 0,
              totalTokenCount: usage.totalTokenCount || 0,
            },
          }
        : null,
      message: "Preview regenerated successfully",
    });
  } catch (error) {
    costMonitor.trackError();
    res.status(500);
    throw new Error(`Regeneration failed: ${error.message}`);
  }
});
