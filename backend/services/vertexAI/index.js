/**
 * VertexAIService - Main entry point for AI generations
 * Uses @google/genai with Vertex AI backend (ADC via Cloud Run service account).
 */
import { createCache, getCacheStats } from "./cacheManager.js";
import { initializeVertexAI } from "./initialization.js";
import { extractUsage, extractText } from "./responseUtils.js";
import {
  buildOptimizedPrompt,
  buildWebsitePrompt,
  buildCombinedPrompt,
  buildProjectRequirementsPrompt,
  buildWebsiteIdeasPrompt,
} from "./promptBuilders.js";
import { buildWorkspaceProposalPrompt } from "./workspacePromptBuilder.js";
import { resolveTemplateType } from "./templateStructureHelper.js";
import {
  generateMockWebsite,
  generateMockAnalysis,
  generateMockCombined,
  generateMockProjectRequirements,
  generateMockWebsiteIdeas,
  generateMockWorkspaceProposal,
} from "./mockGenerators.js";
import { extractPageAndComponentPaths } from "../../utils/previewCodeStructure.js";
import { DEFAULT_MODEL, DEFAULT_CONFIG } from "./modelManager.js";

import {
  parseCombinedResponse,
  hashString,
  fixBrokenImageSrc,
  normalizeComponentCode,
} from "./responseParser.js";

class VertexAIService {
  constructor() {
    this.cache = createCache();
    this.ai = null;
    this.initialized = false;

    this.initializeVertexAI().catch((err) => {
      console.error("Vertex AI initialization failed:", err.message);
    });
  }

  async initializeVertexAI() {
    const result = await initializeVertexAI();
    this.ai = result.ai;
    this.initialized = result.initialized;
  }

  // Shared helper: call generateContent on any prompt string
  async _generate(prompt, modelId = DEFAULT_MODEL) {
    return this.ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: DEFAULT_CONFIG,
    });
  }

  /**
   * GENERATES THE COMBINED PREVIEW: analysis + code in one call
   */
  async generateCombinedPreview(prompt, userInputs, modelId = DEFAULT_MODEL) {
    if (!this.initialized || !this.ai) {
      console.warn("⚠️ Vertex AI not initialized, using mock data");
      return generateMockCombined(prompt, userInputs, this.cache);
    }

    const cacheKey = `combined_${modelId}_${hashString(prompt + JSON.stringify(userInputs))}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      const { type: templateType } = resolveTemplateType(
        userInputs.projectType,
        prompt,
        userInputs.previewTemplate,
      );
      console.log("[AI Preview] Combined cache hit:", { templateType, fromCache: true });
      return { result: cached, fromCache: true, usage: null };
    }

    const { type: templateType } = resolveTemplateType(
      userInputs.projectType,
      prompt,
      userInputs.previewTemplate,
    );
    const combinedPrompt = buildCombinedPrompt(prompt, userInputs);

    if (process.env.DEBUG_PREVIEW_GENERATION === "true") {
      console.log(
        "[AI Preview] Full prompt (truncated):",
        combinedPrompt.substring(0, 3000) + (combinedPrompt.length > 3000 ? "..." : ""),
      );
    }
    console.log("[AI Preview] Vertex AI request:", {
      templateType,
      promptLength: combinedPrompt.length,
      modelId,
    });

    try {
      let response;
      try {
        response = await this._generate(combinedPrompt, modelId);
      } catch (apiError) {
        if (apiError.message?.includes("429")) {
          console.log("⏳ Rate limited, waiting 2 seconds...");
          await new Promise((resolve) => setTimeout(resolve, 2000));
          response = await this._generate(combinedPrompt, modelId);
        } else throw apiError;
      }

      const text = extractText(response);
      const usage = extractUsage(response);
      const parsed = parseCombinedResponse(text);

      this.cache.set(cacheKey, parsed);
      console.log("[AI Preview] Combined generation complete:", {
        tokenUsage: usage?.totalTokenCount,
        fromCache: false,
      });
      return { result: parsed, fromCache: false, usage };
    } catch (error) {
      console.error("Combined Generation Error:", error.message);
      return generateMockCombined(prompt, userInputs, this.cache);
    }
  }

  /**
   * STREAMING: combined preview with real-time chunks via onChunk(text).
   */
  async generateCombinedPreviewStream(
    prompt,
    userInputs,
    modelId = DEFAULT_MODEL,
    onChunk,
  ) {
    if (!this.initialized || !this.ai) {
      console.warn("⚠️ Vertex AI not initialized");
      const mock = generateMockCombined(prompt, userInputs, this.cache);
      if (onChunk && mock.result?.analysis?.overview) onChunk(mock.result.analysis.overview);
      return { result: mock.result, usage: null };
    }

    const { type: templateType } = resolveTemplateType(
      userInputs.projectType,
      prompt,
      userInputs.previewTemplate,
    );
    const combinedPrompt = buildCombinedPrompt(prompt, userInputs);

    if (process.env.DEBUG_PREVIEW_GENERATION === "true") {
      console.log(
        "[AI Preview] Full prompt (truncated):",
        combinedPrompt.substring(0, 3000) + (combinedPrompt.length > 3000 ? "..." : ""),
      );
    }
    console.log("[AI Preview] Vertex AI stream request:", {
      templateType,
      promptLength: combinedPrompt.length,
      modelId,
    });

    let fullText = "";
    try {
      const stream = await this.ai.models.generateContentStream({
        model: modelId,
        contents: combinedPrompt,
        config: DEFAULT_CONFIG,
      });

      let lastChunk = null;
      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          fullText += text;
          if (onChunk) onChunk(text);
        }
        lastChunk = chunk;
      }

      if (fullText.trim().length < 200) {
        if (onChunk) onChunk("\n[Stream too short, fetching full response…]\n");
        return this.generateCombinedPreview(prompt, userInputs, modelId);
      }

      const usage = extractUsage(lastChunk);
      const parsed = parseCombinedResponse(fullText);
      if (parsed.code) {
        parsed.code = normalizeComponentCode(parsed.code);
        parsed.code = fixBrokenImageSrc(parsed.code);
      }
      console.log("[AI Preview] Stream generation complete:", {
        tokenUsage: usage?.totalTokenCount,
      });
      return { result: parsed, usage };
    } catch (error) {
      console.error("Stream Generation Error:", error.message);
      const mock = generateMockCombined(prompt, userInputs, this.cache);
      if (onChunk && mock.result?.analysis?.overview) onChunk(mock.result.analysis.overview);
      return { result: mock.result, usage: null };
    }
  }

  /**
   * GENERATES THE WEBSITE PREVIEW (HTML only)
   */
  async generateWebsitePreview(prompt, userInputs) {
    if (!this.initialized || !this.ai) {
      return generateMockWebsite(prompt, userInputs);
    }

    const cacheKey = `website_${hashString(prompt + JSON.stringify(userInputs))}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return { htmlCode: cached, fromCache: true, usage: null };

    const htmlPrompt = buildWebsitePrompt(prompt, userInputs);
    try {
      const response = await this._generate(htmlPrompt);
      const text = extractText(response);
      const usage = extractUsage(response);

      let cleanHtml = normalizeComponentCode(text);
      cleanHtml = fixBrokenImageSrc(cleanHtml);

      this.cache.set(cacheKey, cleanHtml);
      return { htmlCode: cleanHtml, fromCache: false, usage };
    } catch (error) {
      console.error("Website Preview Error:", error.message);
      return generateMockWebsite(prompt, userInputs);
    }
  }

  /**
   * REGENERATE: For styling updates on existing code
   */
  async regenerateWithContext(cachedCode, modifications, modelId = DEFAULT_MODEL) {
    if (!this.initialized || !this.ai)
      return { htmlCode: cachedCode, fromCache: false, usage: null };

    const regeneratePrompt = `Given this existing React component code, modify ONLY the styling...
    (rest of prompt logic remains same) ... ${cachedCode} ... ${modifications}`;

    try {
      const response = await this._generate(regeneratePrompt, modelId);
      const text = extractText(response);
      const usage = extractUsage(response);

      let cleanCode = normalizeComponentCode(text.trim());
      cleanCode = fixBrokenImageSrc(cleanCode);

      return { htmlCode: cleanCode, fromCache: false, usage };
    } catch (error) {
      console.error("Regenerate Error:", error.message);
      return { htmlCode: cachedCode, fromCache: false, usage: null };
    }
  }

  /**
   * GENERATE PROJECT REQUIREMENTS
   */
  async generateProjectRequirements(prompt, modelId = DEFAULT_MODEL) {
    if (!this.initialized || !this.ai) {
      console.warn("⚠️ Vertex AI not initialized, using mock project requirements");
      return generateMockProjectRequirements(prompt, this.cache);
    }

    const cacheKey = `project_reqs_${modelId}_${hashString(prompt)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log("[Project Requirements] Cache hit");
      return { result: cached, fromCache: true, usage: null };
    }

    const reqPrompt = buildProjectRequirementsPrompt(prompt);
    try {
      const response = await this._generate(reqPrompt, modelId);
      const text = extractText(response);
      const usage = extractUsage(response);

      let clean = text.trim();
      clean = clean.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "");
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) clean = match[0];
      clean = clean.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, "");

      const parsed = JSON.parse(clean);
      this.cache.set(cacheKey, parsed);
      console.log("[Project Requirements] Generation complete:", { tokenUsage: usage?.totalTokenCount });
      return { result: parsed, fromCache: false, usage };
    } catch (error) {
      console.error("Project Requirements Error:", error.message);
      return generateMockProjectRequirements(prompt, this.cache);
    }
  }

  /**
   * WEBSITE IDEAS
   */
  async generateWebsiteIdeas(prompt, modelId = DEFAULT_MODEL) {
    if (!this.initialized || !this.ai) {
      console.warn("⚠️ Vertex AI not initialized, using mock website ideas");
      const mock = generateMockWebsiteIdeas(prompt);
      return { result: mock, fromCache: false, usage: null };
    }

    const cacheKey = `website_ideas_${modelId}_${hashString(prompt)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log("[Website Ideas] Cache hit");
      return { result: cached, fromCache: true, usage: null };
    }

    const ideasPrompt = buildWebsiteIdeasPrompt(prompt);
    try {
      const response = await this._generate(ideasPrompt, modelId);
      const text = extractText(response);
      const usage = extractUsage(response);

      let clean = text.trim();
      clean = clean.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "");
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) clean = match[0];
      clean = clean.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, "");

      const parsed = JSON.parse(clean);
      const ideas = Array.isArray(parsed.ideas) ? parsed.ideas : [];
      const normalized = { ideas };
      this.cache.set(cacheKey, normalized);
      console.log("[Website Ideas] Generation complete:", { tokenUsage: usage?.totalTokenCount, count: ideas.length });
      return { result: normalized, fromCache: false, usage };
    } catch (error) {
      console.error("Website Ideas Error:", error.message);
      const mock = generateMockWebsiteIdeas(prompt);
      return { result: mock, fromCache: false, usage: null };
    }
  }

  /**
   * WORKSPACE PROPOSAL
   */
  async generateWorkspaceProposal(project, preview, modelId = DEFAULT_MODEL) {
    const getCodeStructure = () =>
      preview?.metadata ? extractPageAndComponentPaths(preview.metadata) : {};
    const getAnalysis = () =>
      preview?.previewResult ? this._parsePreviewResult(preview.previewResult) : {};

    if (!this.initialized || !this.ai) {
      console.warn("⚠️ Vertex AI not initialized, using mock Workspace proposal");
      return generateMockWorkspaceProposal(project, {
        analysis: getAnalysis(),
        codeStructure: getCodeStructure(),
      });
    }

    const analysis = getAnalysis();
    const codeStructure = getCodeStructure();
    const prompt = buildWorkspaceProposalPrompt(project, { analysis, codeStructure });

    console.log("[Workspace] Generating AI proposal:", { projectId: project?._id, modelId });

    try {
      const response = await this._generate(prompt, modelId);
      const text = extractText(response);

      let clean = text.trim();
      clean = clean.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "");
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) clean = match[0];
      clean = clean.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, "");

      const parsed = JSON.parse(clean);
      const phases = Array.isArray(parsed.phases) ? parsed.phases : [];

      if (phases.length === 0) {
        console.warn("[Workspace] AI returned empty phases, falling back to mock");
        return generateMockWorkspaceProposal(project, { analysis, codeStructure });
      }

      return phases.map((p, i) => ({
        title: p.title || `Phase ${i + 1}`,
        description: p.description ?? null,
        order: typeof p.order === "number" ? p.order : i + 1,
        weeks: typeof p.weeks === "number" ? p.weeks : null,
        deliverables: Array.isArray(p.deliverables) ? p.deliverables : [],
        subSteps: Array.isArray(p.subSteps)
          ? p.subSteps.map((s, j) => ({
              title: s.title || `Task ${j + 1}`,
              order: typeof s.order === "number" ? s.order : j + 1,
              todos: Array.isArray(s.todos)
                ? s.todos
                    .map((t, k) => ({ text: typeof t.text === "string" ? t.text.trim() : "", order: k + 1 }))
                    .filter((t) => t.text)
                : [],
              requiredAttachments: Array.isArray(s.requiredAttachments)
                ? s.requiredAttachments
                    .map((ra, k) => ({
                      label: typeof ra.label === "string" ? ra.label.trim() : `Attachment ${k + 1}`,
                      description: typeof ra.description === "string" ? ra.description.trim() : "",
                      order: typeof ra.order === "number" ? ra.order : k + 1,
                    }))
                    .filter((ra) => ra.label)
                : [],
            }))
          : [],
      }));
    } catch (error) {
      console.error("[Workspace] Generation error:", error.message);
      return generateMockWorkspaceProposal(project, { analysis, codeStructure });
    }
  }

  _parsePreviewResult(raw) {
    if (!raw || typeof raw !== "string") return {};
    try {
      const trimmed = raw.trim().replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "");
      return JSON.parse(trimmed);
    } catch {
      return {};
    }
  }

  /**
   * PROJECT ANALYSIS: Text-only generation
   */
  async generateProjectAnalysis(prompt, userInputs) {
    if (!this.initialized || !this.ai)
      return generateMockAnalysis(prompt, userInputs, this.cache);

    const cacheKey = `project_${hashString(prompt + JSON.stringify(userInputs))}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return { result: cached, fromCache: true, usage: null };

    const optimizedPrompt = buildOptimizedPrompt(prompt, userInputs);
    try {
      const response = await this._generate(optimizedPrompt);
      const text = extractText(response);
      const usage = extractUsage(response);

      this.cache.set(cacheKey, text);
      return { result: text, fromCache: false, usage };
    } catch (error) {
      console.error("Analysis Error:", error.message);
      return generateMockAnalysis(prompt, userInputs, this.cache);
    }
  }

  checkVertexAIStatus() {
    return {
      initialized: this.initialized,
      ...getCacheStats(this.cache),
    };
  }
}

export default new VertexAIService();
