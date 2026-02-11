/**
 * Main Vertex AI Service - orchestrates all AI generation functionality
 */
import NodeCache from 'node-cache';
import { initializeVertexAI } from './initialization.js';
import { createModelManager, getModelIdVariants } from './modelManager.js';
import { buildOptimizedPrompt, buildWebsitePrompt, buildCombinedPrompt } from './promptBuilders.js';
import { generateMockWebsite, generateMockAnalysis, generateMockCombined } from './mockGenerators.js';
import { extractUsage, extractText, fixBrokenImageSrc, hashString } from './utils.js';
import { parseCombinedResponse, normalizeComponentName } from './responseParser.js';

class VertexAIService {
  constructor() {
    // Initialize cache first (always works)
    this.cache = new NodeCache({ 
      stdTTL: 3600,  // 1 hour cache
      checkperiod: 600 
    });

    this.vertex = null;
    this.model = null;
    this.modelInstances = new Map(); // Cache model instances by modelId
    this.initialized = false;
    
    // Try to initialize Vertex AI, but don't crash if it fails
    // This allows the server to start even if Vertex AI auth fails
    // Note: initializeVertexAI is now async, but we call it without await
    // to avoid blocking server startup. It will initialize in the background.
    this.initializeVertexAI().catch(err => {
      // Already handled in initializeVertexAI, just catch to prevent unhandled rejection
      console.error('Vertex AI initialization promise rejected:', err.message);
    });
  }
  
  async initializeVertexAI() {
    const result = await initializeVertexAI();
    this.vertex = result.vertex;
    this.model = result.model;
    this.initialized = result.initialized;
    
    // Create model manager
    if (this.vertex) {
      const modelManager = createModelManager(this.vertex, this.modelInstances);
      this.getModel = modelManager.getModel.bind(modelManager);
    }
  }

  async generateProjectAnalysis(prompt, userInputs) {
    if (!this.initialized || !this.model) {
      console.warn('⚠️ Vertex AI not initialized, using mock data');
      return generateMockAnalysis(prompt, userInputs, this.cache);
    }
    
    const cacheKey = `project_${hashString(prompt + JSON.stringify(userInputs))}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('✅ Cache hit - saving API call');
      return { result: cached, fromCache: true, usage: null };
    }

    const optimizedPrompt = buildOptimizedPrompt(prompt, userInputs);

    try {
      const response = await this.model.generateContent(optimizedPrompt);
      const text = extractText(response);
      const usage = extractUsage(response);
      const result = text;
      
      this.cache.set(cacheKey, result);
      return { result, fromCache: false, usage };
    } catch (error) {
      console.error('Vertex AI Error:', error.message);
      if (error.response) console.error('Response structure:', JSON.stringify(error.response, null, 2));
      console.warn('⚠️  API call failed - using MOCK data');
      return generateMockAnalysis(prompt, userInputs, this.cache);
    }
  }

  async generateWebsitePreview(prompt, userInputs) {
    if (!this.initialized || !this.model) {
      console.error('❌❌❌ VERTEX AI NOT INITIALIZED - USING MOCK DATA ❌❌❌');
      return generateMockWebsite(prompt, userInputs, this.cache);
    }
    
    const cacheKey = `website_${hashString(prompt + JSON.stringify(userInputs))}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('✅ Website cache hit - saving API call');
      return { htmlCode: cached, fromCache: true, usage: null };
    }

    const htmlPrompt = buildWebsitePrompt(prompt, userInputs);

    try {
      const response = await this.model.generateContent(htmlPrompt);
      const text = extractText(response);
      const usage = extractUsage(response);
      
      let cleanHtml = text.trim();
      if (cleanHtml.startsWith('```html')) {
        cleanHtml = cleanHtml.replace(/```html\n?/g, '').replace(/```\n?$/g, '');
      } else if (cleanHtml.startsWith('```')) {
        cleanHtml = cleanHtml.replace(/```\n?/g, '');
      }
      cleanHtml = fixBrokenImageSrc(cleanHtml);
      
      this.cache.set(cacheKey, cleanHtml);
      return { htmlCode: cleanHtml, fromCache: false, usage };
    } catch (error) {
      console.error('❌❌❌ VERTEX AI API CALL FAILED ❌❌❌');
      console.error('   Error:', error.message);
      console.error('   Error code:', error.code);
      console.error('   Full error:', JSON.stringify(error, null, 2));
      console.error('   ⚠️  FALLING BACK TO MOCK DATA - NO REAL AI GENERATION');
      console.error('   ⚠️  NO BILLING CHARGES - NO API CALLS MADE');
      
      // Log specific error types
      if (error.message?.includes('authentication') || error.message?.includes('permission')) {
        console.error('   🔑 AUTHENTICATION ERROR:');
        console.error('      - Check service account has "Vertex AI User" role');
        console.error('      - Verify GCP_PROJECT_ID is correct');
        console.error('      - Check Cloud Run service account permissions');
      }
      if (error.message?.includes('quota') || error.message?.includes('limit') || 
          error.message?.includes('429') || error.message?.includes('Too Many Requests') ||
          error.message?.includes('RESOURCE_EXHAUSTED') || error.code === 429) {
        console.error('   📊 RATE LIMIT/QUOTA ERROR (429):');
        console.error('      - Vertex AI API quota exceeded or rate limit hit');
        console.error('      - Check quotas in GCP Console: https://console.cloud.google.com/iam-admin/quotas');
        console.error('      - Consider increasing rate limit delay or upgrading quota');
        console.error('      - Request will be retried with exponential backoff');
      }
      if (error.message?.includes('not found') || error.message?.includes('404')) {
        console.error('   🔍 MODEL NOT FOUND: Try VERTEX_AI_MODEL=gemini-2.0-flash (or another model ID)');
      }
      
      return generateMockWebsite(prompt, userInputs, this.cache);
    }
  }

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

    // Get model - getModel() already handles variants, so we don't need to retry here
    const model = await this.getModel(modelId);
    if (!model) {
      console.warn('⚠️ Model not available, using mock data');
      return generateMockCombined(prompt, userInputs, this.cache);
    }

    const combinedPrompt = buildCombinedPrompt(prompt, userInputs);

    try {
      // Single API call - no retries, no variant attempts
      const apiResponse = await model.generateContent(combinedPrompt);
      const text = extractText(apiResponse);
      const usageData = extractUsage(apiResponse);
      
      // Parse JSON response with robust error handling
      const parsed = parseCombinedResponse(text);
      
      this.cache.set(cacheKey, parsed);
      return { result: parsed, fromCache: false, usage: usageData };
    } catch (error) {
      console.error('Vertex AI Error:', error.message);
      
      // Check if it's a 429 error (handle nested error structure)
      const errorCode = error.code || error.error?.code;
      const errorStatus = error.status || error.error?.status;
      const errorMessage = error.message || error.error?.message || '';
      
      const isRateLimit = errorMessage.includes('429') || 
                          errorMessage.includes('Too Many Requests') ||
                          errorMessage.includes('RESOURCE_EXHAUSTED') ||
                          errorCode === 429 ||
                          errorStatus === 429 ||
                          errorStatus === 'RESOURCE_EXHAUSTED';
      
      if (isRateLimit) {
        console.error('   📊 RATE LIMIT EXCEEDED (429):');
        console.error('      - Vertex AI API quota/rate limit exceeded');
        console.error('      - Check quotas: https://console.cloud.google.com/iam-admin/quotas');
        console.error('      - Stopping immediately - no retries will be attempted');
      }
      
      console.warn('⚠️  API call failed - using MOCK data');
      return generateMockCombined(prompt, userInputs, this.cache);
    }
  }

  async regenerateWithContext(cachedCode, modifications, modelId = 'gemini-2.0-flash') {
    if (!this.initialized || !this.vertex) {
      console.warn('⚠️ Vertex AI not initialized');
      return { htmlCode: cachedCode, fromCache: false, usage: null };
    }

    const model = await this.getModel(modelId);
    if (!model) {
      console.warn('⚠️ Model not available');
      return { htmlCode: cachedCode, fromCache: false, usage: null };
    }

    const regeneratePrompt = `Given this existing React component code, modify ONLY the styling (colors, spacing, layout). Keep all content, structure, and functionality identical.

EXISTING CODE:
\`\`\`jsx
${cachedCode}
\`\`\`

MODIFICATIONS REQUESTED:
${modifications || 'Change color scheme, adjust spacing and layout for a fresh look'}

REQUIREMENTS:
- Keep component name: App
- Keep all content and text identical
- Keep all functionality identical
- Only modify: colors, spacing, padding, margins, layout (grid/flex), shadows, borders
- Use Tailwind CSS classes
- Return ONLY the complete React component code
- NO markdown code blocks
- Component MUST be: function App() { ... } OR const App = () => { ... }
- Export: export default App;

Generate the modified component:`;

    try {
      const response = await model.generateContent(regeneratePrompt);
      const text = extractText(response);
      const usage = extractUsage(response);
      
      let cleanCode = text.trim();
      if (cleanCode.startsWith('```jsx')) {
        cleanCode = cleanCode.replace(/```jsx\n?/g, '').replace(/```\n?$/g, '');
      } else if (cleanCode.startsWith('```')) {
        cleanCode = cleanCode.replace(/```\n?/g, '');
      }
      
      // Normalize component name
      cleanCode = normalizeComponentName(cleanCode);
      cleanCode = fixBrokenImageSrc(cleanCode);
      
      return { htmlCode: cleanCode, fromCache: false, usage };
    } catch (error) {
      console.error('Regenerate Error:', error.message);
      return { htmlCode: cachedCode, fromCache: false, usage: null };
    }
  }

  // Get cache statistics
  getCacheStats() {
    return {
      keys: this.cache.keys().length,
      hits: this.cache.getStats().hits,
      misses: this.cache.getStats().misses
    };
  }

  checkVertexAIStatus() {
    return {
      initialized: this.initialized,
      ...this.getCacheStats()
    };
  }
}

export default VertexAIService;
