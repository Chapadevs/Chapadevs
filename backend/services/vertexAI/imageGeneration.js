/**
 * Gemini 2.5 Flash Image generation for AI previews.
 * Uses @google/genai with Vertex AI (gemini-2.5-flash-image).
 * @see https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal-response-generation
 */

const IMAGE_MODEL = 'gemini-2.5-flash-image';
/** Always 3 images: logo (image-1), hero (image-2), display (image-3). Logo generated first to avoid 429 rate limits. */
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

/** Delay (ms) before first retry on 429 Resource Exhausted. */
const RETRY_DELAY_MS = 10000;
/** Delay (ms) before second retry on 429. */
const RETRY_DELAY_2_MS = 20000;

function is429(err) {
  const msg = String(err?.message || err?.error?.message || err || '');
  return msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Too Many Requests');
}

/**
 * Generate a single image from a text prompt. Returns a data URL or null.
 * Retries up to 2 times with increasing delay on 429 Resource Exhausted.
 * @param {string} prompt - Description for the image
 * @returns {Promise<string|null>} data:image/png;base64,... or null
 */
export async function generateOneImage(prompt) {
  const ai = await getClient();
  if (!ai || !ai.Modality) return null;

  const attempt = async () => {
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
    return null;
  };

  try {
    const result = await attempt();
    if (result) return result;
  } catch (err) {
    if (!is429(err)) {
      console.warn('Image generation failed:', err?.message);
      return null;
    }
    for (let r = 0; r < 2; r++) {
      const delay = r === 0 ? RETRY_DELAY_MS : RETRY_DELAY_2_MS;
      console.warn(`Image generation 429, retry ${r + 1}/2 after ${delay / 1000} s...`);
      await new Promise((res) => setTimeout(res, delay));
      try {
        const retryResult = await attempt();
        if (retryResult) return retryResult;
      } catch (retryErr) {
        if (!is429(retryErr)) {
          console.warn('Image generation failed:', retryErr?.message);
          return null;
        }
        if (r === 1) {
          console.warn('Image generation failed after 2 retries:', retryErr?.message);
          return null;
        }
      }
    }
    return null;
  }
  return null;
}

/**
 * Build logo image prompt (slot 0 = image-1). Flat 2D icon for header.
 * Generated first to avoid 429 rate limits. Gemini does not support true transparency; we accept simple solid background.
 * @param {object} analysis - Parsed analysis
 * @returns {string}
 */
export function buildLogoPrompt(analysis) {
  const title = analysis?.businessName || analysis?.title || 'Business';
  const logoConcept = (analysis?.logoIconConcept || 'abstract professional mark').slice(0, 80);
  return `Simple flat logo icon for "${title}". ${logoConcept}. Geometric symbol or minimalist emblem like an app icon. Square, centered, white or light background. No 3D, no photograph, no scene. Small icon usable at 48x48px.`;
}

/**
 * Build hero image prompt (slot 1 = image-2). Main banner.
 * @param {object} analysis - Parsed analysis
 * @returns {string}
 */
export function buildHeroPrompt(analysis) {
  const title = analysis?.businessName || analysis?.title || 'Business';
  const overview = (analysis?.overview || '').slice(0, 200);
  return `Standalone photograph or illustration representing "${title}". ${overview || 'Modern, clean, professional.'} CRITICAL: Output ONLY the image content — no website header, no navigation bar, no logo, no UI elements, no text overlay, no webpage layout. Pure visual content only (e.g. interior, product, scene).`;
}

/**
 * Build display image prompt (slot 2 = image-3). Used for content around the site.
 * Must reflect the user's request (e.g. monkeys, bakery) — uses userPrompt and overview for accuracy.
 * @param {object} analysis - Parsed analysis
 * @param {string} userPrompt - Original user request (e.g. "I need a website about monkeys")
 * @returns {string}
 */
export function buildDisplayPrompt(analysis, userPrompt) {
  const title = analysis?.businessName || analysis?.title || 'Business';
  const overview = (analysis?.overview || '').slice(0, 200);
  const context = [userPrompt, overview].filter(Boolean).join('. ').slice(0, 250) || title;
  return `Standalone photograph or illustration for content imagery. SUBJECT/TOPIC (CRITICAL - must depict this): "${context}". MUST show the SAME theme/subject as the user's request — a detail shot, product, or scene that belongs to this topic. Different angle or composition than the hero (not a wide banner). Professional, clean. CRITICAL: Pure image only — no header, no navigation, no UI, no text.`;
}

/**
 * Build exactly 3 image prompts: logo, hero, display.
 * Slot 0 = logo (image-1), slot 1 = hero (image-2), slot 2 = display (image-3).
 * @param {object} analysis - Parsed analysis (title, overview, features, etc.)
 * @param {string} userPrompt - Original user request (passed to display prompt for subject accuracy)
 * @param {number} count - Number of images (ignored; always 3)
 * @returns {string[]} Array of 3 prompts
 */
export function buildImagePrompts(analysis, userPrompt, count = MAX_IMAGES) {
  return [
    buildLogoPrompt(analysis),
    buildHeroPrompt(analysis),
    buildDisplayPrompt(analysis, userPrompt || ''),
  ];
}

const DISPLAY_PLACEHOLDER_URL = 'https://placehold.co/400x300?text=Image';
const HERO_PLACEHOLDER_URL = 'https://placehold.co/1200x600?text=Hero';
const LOGO_PLACEHOLDER_URL = 'https://placehold.co/96x96?text=Logo';

/** Delay between API requests to reduce 429 rate limits. */
const STAGGER_DELAY_MS = 4000;

/**
 * Generate exactly 3 images for a preview: logo, hero, display.
 * Logo generated first to avoid 429 rate limits. Sequential with stagger.
 * @param {object} analysis - Parsed analysis from combined preview
 * @param {string} userPrompt - Original user prompt
 * @param {number} count - Ignored; always generates 3 images
 * @returns {Promise<string[]>} Array of 3 data URLs [logo, hero, display]
 */
export async function generateImagesForPreview(analysis, userPrompt, count = MAX_IMAGES) {
  const ai = await getClient();
  if (!ai) return [LOGO_PLACEHOLDER_URL, HERO_PLACEHOLDER_URL, DISPLAY_PLACEHOLDER_URL];

  const prompts = buildImagePrompts(analysis, userPrompt, MAX_IMAGES);

  const logoUrl = await generateOneImage(prompts[0]);
  await new Promise((r) => setTimeout(r, STAGGER_DELAY_MS));
  const heroUrl = await generateOneImage(prompts[1]);
  await new Promise((r) => setTimeout(r, STAGGER_DELAY_MS));
  const displayUrl = await generateOneImage(prompts[2]);

  const valid = (u) => u && u.startsWith('data:image/');

  return [
    valid(logoUrl) ? logoUrl : LOGO_PLACEHOLDER_URL,
    valid(heroUrl) ? heroUrl : (valid(displayUrl) ? displayUrl : HERO_PLACEHOLDER_URL),
    valid(displayUrl) ? displayUrl : (valid(heroUrl) ? heroUrl : DISPLAY_PLACEHOLDER_URL),
  ];
}
