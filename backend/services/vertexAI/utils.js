/**
 * Utility functions for Vertex AI service
 */

/**
 * Extract usage metadata from Vertex AI response
 */
export function extractUsage(response) {
  const um = response?.response?.usageMetadata || response?.usageMetadata;
  if (!um) return null;
  const promptTokenCount = um.promptTokenCount ?? um.prompt_token_count ?? 0;
  const candidatesTokenCount = um.candidatesTokenCount ?? um.candidates_token_count ?? 0;
  const totalTokenCount = um.totalTokenCount ?? um.total_token_count ?? (promptTokenCount + candidatesTokenCount);
  return { promptTokenCount, candidatesTokenCount, totalTokenCount };
}

/**
 * Extract text from Vertex AI response
 */
export function extractText(response) {
  if (typeof response?.text === 'function') return response.text();
  if (typeof response?.text === 'string') return response.text;
  if (response?.response && typeof response.response.text === 'function') return response.response.text();
  if (typeof response?.response?.text === 'string') return response.response.text;
  if (response?.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
    return response.response.candidates[0].content.parts[0].text;
  }
  throw new Error('Unable to extract text from Vertex AI response.');
}

/**
 * Fix broken image sources in HTML
 */
export function fixBrokenImageSrc(html) {
  const allowlist = ['picsum.photos', 'placehold.co', 'placeholder.com'];
  const isAllowed = (src) => allowlist.some((h) => (src || '').trim().toLowerCase().includes(h));
  return html.replace(/<img([^>]*)\ssrc=["']([^"']*)["']([^>]*)>/gi, (match, before, src, after) => {
    if (isAllowed(src)) return match;
    const altMatch = /alt=["']([^"']*)["']/i.exec(match);
    const alt = altMatch ? encodeURIComponent(altMatch[1].slice(0, 30)) : 'Preview';
    return `<img${before} src="https://placehold.co/400x300?text=${alt}"${after}>`;
  });
}

/**
 * Hash a string to generate cache keys
 */
export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

