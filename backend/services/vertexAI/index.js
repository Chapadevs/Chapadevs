/**
 * VertexAIService - Main entry point for AI generations
 */
import { createCache, getCacheStats } from './cacheManager.js';
import { initializeVertexAI } from './initialization.js';
import { extractUsage, extractText } from './responseUtils.js';
import { buildOptimizedPrompt, buildWebsitePrompt, buildCombinedPrompt } from './promptBuilders.js';
import { generateMockWebsite, generateMockAnalysis, generateMockCombined } from './mockGenerators.js';
import { getModel } from './modelManager.js';

// ALL PARSING LOGIC NOW LIVES HERE
import { 
  parseCombinedResponse, 
  hashString, 
  fixBrokenImageSrc, 
  normalizeComponentCode 
} from './responseParser.js';

class VertexAIService {
  constructor() {
    this.cache = createCache();
    this.vertex = null;
    this.model = null;
    this.modelInstances = new Map();
    this.initialized = false;
    
    this.initializeVertexAI().catch(err => {
      console.error('Vertex AI initialization failed:', err.message);
    });
  }
  
  async initializeVertexAI() {
    const result = await initializeVertexAI();
    this.vertex = result.vertex;
    this.model = result.model;
    this.initialized = result.initialized;
  }

  /**
   * GENERATES THE COMBINED PREVIEW: analysis + code in one call
   */
  async generateCombinedPreview(prompt, userInputs, modelId = 'gemini-2.0-flash') {
    if (!this.initialized || !this.vertex) {
      console.warn('⚠️ Vertex AI not initialized, using mock data');
      return generateMockCombined(prompt, userInputs, this.cache);
    }

    const cacheKey = `combined_${modelId}_${hashString(prompt + JSON.stringify(userInputs))}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('✅ Combined cache hit - saving API call');
      return { result: cached, fromCache: true, usage: null };
    }

    const model = await this.getModel(modelId);
    if (!model) return generateMockCombined(prompt, userInputs, this.cache);

    const combinedPrompt = buildCombinedPrompt(prompt, userInputs);

    try {
      let response;
      try {
        response = await model.generateContent(combinedPrompt);
      } catch (apiError) {
        if (apiError.message?.includes('429')) {
          console.log('⏳ Rate limited, waiting 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          response = await model.generateContent(combinedPrompt);
        } else throw apiError;
      }
      
      const text = extractText(response);
      const usage = extractUsage(response);
      
      // THE NEW CLEAN PARSER CALL
      const parsed = parseCombinedResponse(text);
      
      this.cache.set(cacheKey, parsed);
      return { result: parsed, fromCache: false, usage };

    } catch (error) {
      console.error('Combined Generation Error:', error.message);
      return generateMockCombined(prompt, userInputs, this.cache);
    }
  }

  /**
   * GENERATES THE WEBSITE PREVIEW (HTML only)
   */
  async generateWebsitePreview(prompt, userInputs) {
    if (!this.initialized || !this.model) {
      return generateMockWebsite(prompt, userInputs);
    }
    
    const cacheKey = `website_${hashString(prompt + JSON.stringify(userInputs))}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return { htmlCode: cached, fromCache: true, usage: null };

    const htmlPrompt = buildWebsitePrompt(prompt, userInputs);

    try {
      const response = await this.model.generateContent(htmlPrompt);
      const text = extractText(response);
      const usage = extractUsage(response);
      
      // Clean and fix images
      let cleanHtml = normalizeComponentCode(text);
      cleanHtml = fixBrokenImageSrc(cleanHtml);
      
      this.cache.set(cacheKey, cleanHtml);
      return { htmlCode: cleanHtml, fromCache: false, usage };
    } catch (error) {
      console.error('Website Preview Error:', error.message);
      return generateMockWebsite(prompt, userInputs);
    }
  }

  /**
   * REGENERATE: For styling updates on existing code
   */
  async regenerateWithContext(cachedCode, modifications, modelId = 'gemini-2.0-flash') {
    if (!this.initialized || !this.vertex) return { htmlCode: cachedCode, fromCache: false, usage: null };

    const model = await this.getModel(modelId);
    const regeneratePrompt = `Given this existing React component code, modify ONLY the styling... 
    (rest of prompt logic remains same) ... ${cachedCode} ... ${modifications}`;

    try {
      const response = await model.generateContent(regeneratePrompt);
      const text = extractText(response);
      const usage = extractUsage(response);
      
      // Use the consolidated normalization
      let cleanCode = normalizeComponentCode(text.trim());
      cleanCode = fixBrokenImageSrc(cleanCode);
      
      return { htmlCode: cleanCode, fromCache: false, usage };
    } catch (error) {
      console.error('Regenerate Error:', error.message);
      return { htmlCode: cachedCode, fromCache: false, usage: null };
    }
  }

  /**
   * PROJECT ANALYSIS: Text-only generation
   */
  async generateProjectAnalysis(prompt, userInputs) {
    if (!this.initialized || !this.model) return generateMockAnalysis(prompt, userInputs, this.cache);
    
    const cacheKey = `project_${hashString(prompt + JSON.stringify(userInputs))}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return { result: cached, fromCache: true, usage: null };

    const optimizedPrompt = buildOptimizedPrompt(prompt, userInputs);

    try {
      const response = await this.model.generateContent(optimizedPrompt);
      const text = extractText(response);
      const usage = extractUsage(response);
      
      this.cache.set(cacheKey, text);
      return { result: text, fromCache: false, usage };
    } catch (error) {
      console.error('Analysis Error:', error.message);
      return generateMockAnalysis(prompt, userInputs, this.cache);
    }
  }

  // --- HELPERS & STATUS ---

  async getModel(modelId = 'gemini-2.0-flash') {
    return getModel(this.vertex, this.modelInstances, modelId);
  }

  checkVertexAIStatus() {
    return {
      initialized: this.initialized,
      ...getCacheStats(this.cache)
    };
  }
}

export default new VertexAIService();