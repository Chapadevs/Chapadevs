/**
 * Shared code utilities for AI response parsing.
 * Single source of truth for unescaping and related string transformations.
 */

/**
 * Unescapes AI/JSON string literals into executable code.
 * Handles: \\n, \\r, \\t, \\", \\\\, and optionally full JSON-wrapped strings.
 * Robust against double-escaped content (JSON inside JSON).
 * @param {string} code - Raw code string from AI (may be JSON-escaped)
 * @returns {string} Executable JavaScript/JSX code
 */
export function unescapeCode(code) {
  if (code == null || typeof code !== "string") return "";

  let c = String(code).trim();

  try {
    if (c.startsWith('"') && c.endsWith('"')) {
      c = JSON.parse(c);
    }
  } catch {
    // Not valid JSON string literal, continue with replace chain
  }

  return c
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}
