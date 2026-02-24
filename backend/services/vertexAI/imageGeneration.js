/**
 * Gemini 2.5 Flash Image generation for AI previews.
 * Uses @google/genai with Vertex AI (gemini-2.5-flash-image).
 * @see https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal-response-generation
 */

const IMAGE_MODEL = 'gemini-2.5-flash-image';
/** 1 hero (preview thumbnail + Hero component) + 2 others for all remaining image placeholders */
const MAX_IMAGES = 3;
const IMAGE_TIMEOUT_MS = 45000;

let client = null;

async function getClient() {
  if (client) return client;
  const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    console.warn('⚠️ GCP_PROJECT_ID not set; image generation disabled.');
    return null;
  }
  try {
    const { GoogleGenAI, Modality } = await import('@google/genai');
    client = new GoogleGenAI({
      vertexai: true,
      project: projectId,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
    });
    client.Modality = Modality;
    return client;
  } catch (e) {
    console.warn('⚠️ @google/genai not available; image generation disabled.', e.message);
    return null;
  }
}

/**
 * Generate a single image from a text prompt. Returns a data URL or null.
 * @param {string} prompt - Description for the image
 * @returns {Promise<string|null>} data:image/png;base64,... or null
 */
export async function generateOneImage(prompt) {
  const ai = await getClient();
  if (!ai || !ai.Modality) return null;

  try {
    const response = await Promise.race([
      ai.models.generateContentStream({
        model: IMAGE_MODEL,
        contents: prompt,
        config: {
          responseModalities: [ai.Modality.TEXT, ai.Modality.IMAGE],
        },
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Image generation timeout')), IMAGE_TIMEOUT_MS)
      ),
    ]);

    for await (const chunk of response) {
      if (chunk?.data) {
        const base64 = Buffer.isBuffer(chunk.data) ? chunk.data.toString('base64') : chunk.data;
        return `data:image/png;base64,${base64}`;
      }
    }
  } catch (err) {
    console.warn('Image generation failed:', err.message);
  }
  return null;
}

/**
 * Build image prompts from analysis and user prompt for preview.
 * Exactly 3 images: 1 hero (same for preview thumbnail and Hero component), 2 others for all remaining placeholders.
 * @param {object} analysis - Parsed analysis (title, overview, features, etc.)
 * @param {string} userPrompt - Original user request
 * @param {number} count - Number of images (default 3; only 3 are used)
 * @returns {string[]} Array of prompts for each image slot
 */
export function buildImagePrompts(analysis, userPrompt, count = MAX_IMAGES) {
  const title = analysis?.title || 'Business';
  const overview = (analysis?.overview || '').slice(0, 200);
  const n = Math.min(Math.max(1, count), MAX_IMAGES);
  const prompts = [];

  prompts.push(
    `Professional hero or banner image for a website about "${title}". ${overview || 'Modern, clean, suitable for a business or brand.'} High quality, web-friendly, no text in the image.`
  );
  if (n <= 1) return prompts;

  prompts.push(
    `Product or service showcase image for "${title}". Professional, clean, suitable for a card or grid on a website. No text in the image.`
  );
  if (n <= 2) return prompts;

  prompts.push(
    `Secondary product or category image for "${title}". Cohesive style with previous images. No text in the image.`
  );
  return prompts.slice(0, n);
}

const PLACEHOLDER_IMAGE_URL = 'https://placehold.co/400x300?text=Image';

/**
 * Generate up to `count` images for a preview and return data URLs.
 * Default 3: 1 hero (preview thumbnail + Hero), 2 others for all other image placeholders.
 * Failed slots are filled with the first successful image, or a placeholder URL, so the array never contains empty strings (avoids broken img src in preview code).
 * @param {object} analysis - Parsed analysis from combined preview
 * @param {string} userPrompt - Original user prompt
 * @param {number} count - Number of images (default 3)
 * @returns {Promise<string[]>} Array of data URLs (no empty strings)
 */
export async function generateImagesForPreview(analysis, userPrompt, count = MAX_IMAGES) {
  const ai = await getClient();
  if (!ai) return Array(Math.min(count, MAX_IMAGES)).fill(PLACEHOLDER_IMAGE_URL);

  const prompts = buildImagePrompts(analysis, userPrompt, count);
  const results = await Promise.allSettled(
    prompts.map((p) => generateOneImage(p))
  );

  const urls = results.map((r) => (r.status === 'fulfilled' && r.value ? r.value : ''));
  const firstValid = urls.find((u) => u && u.startsWith('data:image/')) || PLACEHOLDER_IMAGE_URL;
  return urls.map((u) => (u && u.startsWith('data:image/') ? u : firstValid));
}
