import { createCache, getCacheStats } from './cacheManager.js';
import { initializeVertexAI } from './initialization.js';
import { extractUsage, extractText } from './responseUtils.js';
import { hashString, fixBrokenImageSrc, normalizeComponentCode } from './codeUtils.js';
import { buildOptimizedPrompt, buildWebsitePrompt, buildCombinedPrompt } from './promptBuilders.js';
import { generateMockWebsite, generateMockAnalysis, generateMockCombined } from './mockGenerators.js';
import { getModel } from './modelManager.js';
import { getTemplateStructure } from './templateHelpers.js';

class VertexAIService {
  constructor() {
    // Initialize cache first (always works)
    this.cache = createCache();

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
  }

  extractUsage(response) {
    return extractUsage(response);
  }

  extractText(response) {
    return extractText(response);
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
      const text = this.extractText(response);
      const usage = this.extractUsage(response);
      
      this.cache.set(cacheKey, text);
      return { result: text, fromCache: false, usage };
    } catch (error) {
      // If 429, wait 2 seconds and retry once
      if (error.message?.includes('429') || error.code === 429) {
        console.log('⏳ Rate limited, waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          const response = await this.model.generateContent(optimizedPrompt);
          const text = this.extractText(response);
          const usage = this.extractUsage(response);
          this.cache.set(cacheKey, text);
          return { result: text, fromCache: false, usage };
        } catch (retryError) {
          console.error('Vertex AI Error (after retry):', retryError.message);
          return generateMockAnalysis(prompt, userInputs, this.cache);
        }
      }
      
      console.error('Vertex AI Error:', error.message);
      if (error.response) console.error('Response structure:', JSON.stringify(error.response, null, 2));
      console.warn('⚠️  API call failed - using MOCK data');
      return generateMockAnalysis(prompt, userInputs, this.cache);
    }
  }

  fixBrokenImageSrc(html) {
    return fixBrokenImageSrc(html);
  }

  async generateWebsitePreview(prompt, userInputs) {
    if (!this.initialized || !this.model) {
      console.error('❌❌❌ VERTEX AI NOT INITIALIZED - USING MOCK DATA ❌❌❌');
      return generateMockWebsite(prompt, userInputs);
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
      const text = this.extractText(response);
      const usage = this.extractUsage(response);
      
      let cleanHtml = text.trim();
      if (cleanHtml.startsWith('```html')) {
        cleanHtml = cleanHtml.replace(/```html\n?/g, '').replace(/```\n?$/g, '');
      } else if (cleanHtml.startsWith('```')) {
        cleanHtml = cleanHtml.replace(/```\n?/g, '');
      }
      cleanHtml = this.fixBrokenImageSrc(cleanHtml);
      
      this.cache.set(cacheKey, cleanHtml);
      return { htmlCode: cleanHtml, fromCache: false, usage };
    } catch (error) {
      // If 429, wait 2 seconds and retry once
      if (error.message?.includes('429') || error.code === 429) {
        console.log('⏳ Rate limited, waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          const response = await this.model.generateContent(htmlPrompt);
          const text = this.extractText(response);
          const usage = this.extractUsage(response);
          
          let cleanHtml = text.trim();
          if (cleanHtml.startsWith('```html')) {
            cleanHtml = cleanHtml.replace(/```html\n?/g, '').replace(/```\n?$/g, '');
          } else if (cleanHtml.startsWith('```')) {
            cleanHtml = cleanHtml.replace(/```\n?/g, '');
          }
          cleanHtml = this.fixBrokenImageSrc(cleanHtml);
          
          this.cache.set(cacheKey, cleanHtml);
          return { htmlCode: cleanHtml, fromCache: false, usage };
        } catch (retryError) {
          console.error('Error after retry:', retryError.message);
          return generateMockWebsite(prompt, userInputs);
        }
      }
      
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
      if (error.message?.includes('quota') || error.message?.includes('limit')) {
        console.error('   📊 QUOTA ERROR: Check Vertex AI API quotas in GCP');
      }
      if (error.message?.includes('not found') || error.message?.includes('404')) {
        console.error('   🔍 MODEL NOT FOUND: Try VERTEX_AI_MODEL=gemini-2.0-flash (or another model ID)');
      }
      
      return generateMockWebsite(prompt, userInputs);
    }
  }

  generateMockWebsite(prompt, userInputs) {
    return generateMockWebsite(prompt, userInputs);
  }

  generateMockAnalysis(prompt, userInputs) {
    return generateMockAnalysis(prompt, userInputs, this.cache);
  }

  buildOptimizedPrompt(prompt, userInputs) {
    return buildOptimizedPrompt(prompt, userInputs);
  }

  buildWebsitePrompt(prompt, userInputs) {
    return buildWebsitePrompt(prompt, userInputs);
  }

  hashString(str) {
    return hashString(str);
  }


  // Get cache statistics
  getCacheStats() {
    return getCacheStats(this.cache);
  }

  checkVertexAIStatus() {
    return {
      initialized: this.initialized,
      ...this.getCacheStats()
    };
  }

  // Normalize model ID to correct Vertex AI format
  // Get or create model instance for a specific modelId
  async getModel(modelId = 'gemini-2.0-flash') {
    return getModel(this.vertex, this.modelInstances, modelId);
  }

  // Get template structure based on niche/project type
  getTemplateStructure(niche) {
    return getTemplateStructure(niche);
  }

  // Build optimized combined prompt (analysis + code in one)
  buildCombinedPrompt(prompt, userInputs) {
    return buildCombinedPrompt(prompt, userInputs);
  }

  // Generate combined preview (analysis + code in one call)
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
    if (!model) {
      console.warn('⚠️ Model not available, using mock data');
      return generateMockCombined(prompt, userInputs, this.cache);
    }

    const combinedPrompt = buildCombinedPrompt(prompt, userInputs);

    try {
      let response;
      try {
        response = await model.generateContent(combinedPrompt);
      } catch (apiError) {
        // If 429, wait 2 seconds and retry once
        if (apiError.message?.includes('429') || apiError.code === 429) {
          console.log('⏳ Rate limited, waiting 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          response = await model.generateContent(combinedPrompt);
        } else {
          // For any other error (404, etc.), just throw it
          throw apiError;
        }
      }
      
      const text = this.extractText(response);
      const usage = this.extractUsage(response);
      
      // Parse JSON response with robust error handling
      let cleanText = text.trim();
      
      // Remove markdown code blocks
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/```\n?/g, '');
      }
      
      // Try to extract JSON object if embedded in text
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanText = jsonMatch[0];
      }
      
      // Remove control characters that break JSON (keep \n, \r, \t for formatting)
      cleanText = cleanText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      
      let parsed;
      try {
        parsed = JSON.parse(cleanText);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError.message);
        const errorPos = parseError.message.match(/position (\d+)/)?.[1];
        if (errorPos) {
          const pos = parseInt(errorPos);
          console.error('Error around position:', cleanText.substring(Math.max(0, pos - 50), pos + 50));
        }
        
        // Try to fix common JSON issues - escape control characters in string values
        try {
          let fixedText = cleanText.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match, content) => {
            if (!content) return match;
            const escaped = content
              .replace(/\\/g, '\\\\')
              .replace(/"/g, '\\"')
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '\\r')
              .replace(/\t/g, '\\t');
            return `"${escaped}"`;
          });
          
          parsed = JSON.parse(fixedText);
          console.log('✅ Fixed JSON parsing issues');
        } catch (retryError) {
          try {
            const codeFieldMatch = cleanText.match(/"code"\s*:\s*"([\s\S]*?)"(?=\s*[,}])/);
            if (codeFieldMatch) {
              let codeValue = codeFieldMatch[1]
                .replace(/\\/g, '\\\\')
                .replace(/"/g, '\\"')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r')
                .replace(/\t/g, '\\t');
              
              const fixedCodeJson = cleanText.replace(
                /"code"\s*:\s*"[\s\S]*?"(?=\s*[,}])/,
                `"code": "${codeValue}"`
              );
              parsed = JSON.parse(fixedCodeJson);
              console.log('✅ Fixed JSON by escaping code field');
            } else {
              throw retryError;
            }
          } catch (finalError) {
            console.error('All JSON parsing attempts failed');
            throw new Error('AI returned invalid JSON format');
          }
        }
      }
      
      // Clean and validate code
      if (parsed.code) {
        let code = parsed.code;
        code = normalizeComponentCode(code);
        parsed.code = this.fixBrokenImageSrc(code);
      }
      
      this.cache.set(cacheKey, parsed);
      return { result: parsed, fromCache: false, usage };
    } catch (error) {
      // If 429, wait and retry once more
      if (error.message?.includes('429') || error.code === 429) {
        console.log('⏳ Rate limited again, waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          const model = await this.getModel(modelId);
          const response = await model.generateContent(combinedPrompt);
          const text = this.extractText(response);
          const usage = this.extractUsage(response);
          
          let cleanText = text.trim();
          if (cleanText.startsWith('```json')) {
            cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
          } else if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/```\n?/g, '');
          }
          
          const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
          if (jsonMatch) cleanText = jsonMatch[0];
          
          cleanText = cleanText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
          const parsed = JSON.parse(cleanText);
          
          if (parsed.code) {
            parsed.code = this.fixBrokenImageSrc(normalizeComponentCode(parsed.code));
          }
          
          this.cache.set(cacheKey, parsed);
          return { result: parsed, fromCache: false, usage };
        } catch (retryError) {
          console.error('Vertex AI Error (after retry):', retryError.message);
          return generateMockCombined(prompt, userInputs, this.cache);
        }
      }
      
      console.error('Vertex AI Error:', error.message);
      console.warn('⚠️  API call failed - using MOCK data');
      return generateMockCombined(prompt, userInputs, this.cache);
    }
  }

  // Regenerate with cached context (styling only)
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
      const text = this.extractText(response);
      const usage = this.extractUsage(response);
      
      let cleanCode = normalizeComponentCode(text.trim());
      cleanCode = this.fixBrokenImageSrc(cleanCode);
      
      return { htmlCode: cleanCode, fromCache: false, usage };
    } catch (error) {
      // If 429, wait and retry once
      if (error.message?.includes('429') || error.code === 429) {
        console.log('⏳ Rate limited, waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          const response = await model.generateContent(regeneratePrompt);
          const text = this.extractText(response);
          const usage = this.extractUsage(response);
          
          let cleanCode = normalizeComponentCode(text.trim());
          cleanCode = this.fixBrokenImageSrc(cleanCode);
          
          return { htmlCode: cleanCode, fromCache: false, usage };
        } catch (retryError) {
          console.error('Regenerate Error (after retry):', retryError.message);
          return { htmlCode: cachedCode, fromCache: false, usage: null };
        }
      }
      
      console.error('Regenerate Error:', error.message);
      return { htmlCode: cachedCode, fromCache: false, usage: null };
    }
  }

  // Mock combined response
  generateMockCombined(prompt, userInputs) {
    return generateMockCombined(prompt, userInputs, this.cache);
  }
}

export default new VertexAIService();
