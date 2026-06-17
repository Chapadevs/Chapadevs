/**
 * Model config for @google/genai SDK.
 * Model is specified per-call in generateContent/generateContentStream,
 * so this just centralises the generation config.
 */

export const DEFAULT_MODEL = "gemini-2.5-pro";

export const DEFAULT_CONFIG = {
  maxOutputTokens: 16384,
  temperature: 0.8,
  topP: 0.95,
};
