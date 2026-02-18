/**
 * responseParser.js
 * Universal AI response parser for Sandpack rendering
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

/**
 * Replace unsafe images
 */
export function fixBrokenImageSrc(html) {
  const allowlist = ["picsum.photos", "placehold.co", "placeholder.com"];

  const isAllowed = (src) =>
    allowlist.some((h) => (src || "").toLowerCase().includes(h));

  return html.replace(
    /<img([^>]*)\ssrc=["']([^"']*)["']([^>]*)>/gi,
    (match, before, src, after) => {
      if (isAllowed(src)) return match;

      const altMatch = /alt=["']([^"']*)["']/i.exec(match);
      const alt = altMatch
        ? encodeURIComponent(altMatch[1].slice(0, 30))
        : "Preview";

      return `<img${before} src="https://placehold.co/400x300?text=${alt}"${after}>`;
    }
  );
}

/**
 * Converts escaped AI strings into executable code
 */
function unescapeCode(code) {
  if (!code) return "";

  let c = code.trim();

  try {
    if (c.startsWith('"') && c.endsWith('"')) {
      c = JSON.parse(c);
    }
  } catch {}

  return c
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

/**
 * Repairs small syntax mistakes AI models often generate
 */
function safeSyntaxFix(code) {
  try {
    new Function(code);
    return code;
  } catch {
    return code
      .replace(/;\s*}/g, "}")       // remove ; before }
      .replace(/'\s*;/g, "'")       // string ending ;
      .replace(/,\s*,/g, ",")       // double commas
      .replace(/\{\s*,/g, "{")      // comma after {
      .replace(/,\s*\}/g, "}");     // comma before }
  }
}

/**
 * Normalizes AI component code into valid React component
 */
export function normalizeComponentCode(code) {
  if (!code) return "";

  let c = unescapeCode(code);

  // Remove markdown fences
  c = c.replace(/```[\s\S]*?```/g, (m) =>
    m.replace(/```[a-z]*/gi, "").replace(/```/g, "")
  );

  // Fix escaped quotes AI sometimes outputs
  c = c.replace(/\\'(?=\s*[,\]\}])/g, "'");

  // Escape apostrophes inside words
  c = c.replace(/([a-zA-Z])'([a-zA-Z])/g, "$1\\'$2");

  // Fix objects ending with semicolon
  c = c.replace(/'\s*;/g, "'");

  // Fix extra braces before export
  c = c.replace(/\}\}\s*export default/g, "}\nexport default");

  // Ensure component name = App
  if (!c.includes("function App") && !c.includes("const App")) {
    c = c.replace(
      /(function|const|class)\s+([A-Z][a-zA-Z0-9_]*)/,
      "$1 App"
    );
  }

  // Ensure export default App
  if (!c.includes("export default App")) {
    c = c.replace(/export default\s+\w+;?/g, "");
    if (!c.endsWith(";")) c += ";";
    c += "\n\nexport default App;";
  }

  // Final syntax safety pass
  c = safeSyntaxFix(c);

  return c.trim();
}

/**
 * Manual recovery if JSON.parse fails
 */
function repairAndParseManual(text) {
  const codeStart = text.indexOf('"code"');
  if (codeStart === -1) {
    return {
      analysis: "No JSON detected. Using raw response.",
      code: text,
    };
  }

  const firstQuote = text.indexOf('"', codeStart + 6);
  const start = firstQuote + 1;
  const lastBrace = text.lastIndexOf("}");

  let end = -1;

  for (let i = start; i < lastBrace; i++) {
    if (text[i] === '"' && text[i - 1] !== "\\") {
      const next = text.substring(i + 1).match(/^\s*[,}]/);
      if (next) {
        end = i;
        break;
      }
    }
  }

  let code =
    end !== -1
      ? text.substring(start, end)
      : text.substring(start, lastBrace);

  return {
    analysis: "Recovered manually",
    code,
  };
}

/**
 * MAIN PARSER
 */
export function parseCombinedResponse(text) {
  if (!text) throw new Error("Empty AI response");

  let clean = text.trim();

  // Remove markdown wrappers
  clean = clean
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/```$/i, "");

  // Try extract JSON
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) clean = match[0];

  // Remove control chars
  clean = clean.replace(/[\x00-\x1F\x7F]/g, "");

  let parsed;

  try {
    parsed = JSON.parse(clean);
  } catch {
    parsed = repairAndParseManual(clean);
  }

  if (parsed.code) {
    parsed.code = normalizeComponentCode(parsed.code);
    parsed.code = fixBrokenImageSrc(parsed.code);
  }

  return parsed;
}
