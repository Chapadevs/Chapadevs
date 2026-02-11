/**
 * Response extraction utilities for Vertex AI responses
 */

export function extractUsage(response) {
  const um = response?.response?.usageMetadata || response?.usageMetadata;
  if (!um) return null;
  const promptTokenCount = um.promptTokenCount ?? um.prompt_token_count ?? 0;
  const candidatesTokenCount = um.candidatesTokenCount ?? um.candidates_token_count ?? 0;
  const totalTokenCount = um.totalTokenCount ?? um.total_token_count ?? (promptTokenCount + candidatesTokenCount);
  return { promptTokenCount, candidatesTokenCount, totalTokenCount };
}

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
