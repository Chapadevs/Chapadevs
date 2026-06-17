/**
 * Response extraction utilities for @google/genai SDK.
 * response.text is a plain string — no unwrapping needed.
 */

export function extractText(response) {
  if (typeof response?.text === "string") return response.text;
  throw new Error("Unable to extract text from AI response.");
}

export function extractUsage(response) {
  const um = response?.usageMetadata;
  if (!um) return null;
  const promptTokenCount = um.promptTokenCount ?? 0;
  const candidatesTokenCount = um.candidatesTokenCount ?? 0;
  const totalTokenCount = um.totalTokenCount ?? promptTokenCount + candidatesTokenCount;
  return { promptTokenCount, candidatesTokenCount, totalTokenCount };
}
