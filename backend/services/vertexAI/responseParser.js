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
 * Replace unsafe images. Allows data:image/ (Gemini-generated) and picsum/placehold.
 */
export function fixBrokenImageSrc(html) {
  const allowlist = ["picsum.photos", "placehold.co", "placeholder.com", "data:image/"];

  const isAllowed = (src) =>
    (src || "").startsWith("data:image/") ||
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
 * Inject generated image data URLs into code and/or files.
 * Replaces __IMAGE_1__ (hero), __IMAGE_2__, __IMAGE_3__ with dataUrls[0], [1], [2].
 * __IMAGE_4__, __IMAGE_5__, __IMAGE_6__ map to the 2 extra images so every placeholder gets one of the 3 (images can repeat).
 * Missing or invalid URLs use fallback. Does not modify code structure or syntax.
 * @param {string} code - Single App.js code string
 * @param {object|null} files - Optional files object (path -> content)
 * @param {string[]} dataUrls - Array of up to 3 data URLs (hero, other1, other2)
 * @returns {{ code: string, files: object|null }}
 */
export function injectGeneratedImages(code, files, dataUrls) {
  const fallback = "https://placehold.co/400x300?text=Image";
  const urls = Array.isArray(dataUrls) ? dataUrls : [];
  const valid = (u) => typeof u === "string" && u.trim().length > 0 && u.startsWith("data:image/");
  const getUrl = (slotIndex0Based) => {
    let idx = slotIndex0Based;
    if (slotIndex0Based >= 3) {
      idx = 1 + (slotIndex0Based % 2);
    }
    const u = valid(urls[idx]) ? urls[idx] : fallback;
    return u && u.trim() ? u.trim() : fallback;
  };

  // Replace AI-emitted placehold.co URLs with __IMAGE_N__ so they get real images when dataUrls exist
  const replacePlaceholderUrlsWithImageSlots = (text) => {
    if (!text || typeof text !== "string") return text;
    const placeholdPattern = /https:\/\/placehold\.co\/[^'"]*['"]/g;
    let slot = 0;
    return text.replace(placeholdPattern, (match) => {
      const n = (slot % 3) + 1;
      slot += 1;
      const quote = match.slice(-1);
      return `__IMAGE_${n}__${quote}`;
    });
  };

  const replaceInText = (text) => {
    if (!text || typeof text !== "string") return text;
    let out = text;
    if (urls.length > 0) {
      out = replacePlaceholderUrlsWithImageSlots(out);
    }
    for (let i = 1; i <= 6; i++) {
      const placeholder = `__IMAGE_${i}__`;
      out = out.split(placeholder).join(getUrl(i - 1));
    }
    return out;
  };

  const newCode = replaceInText(code || "");
  let newFiles = null;
  if (files && typeof files === "object") {
    newFiles = {};
    for (const [path, content] of Object.entries(files)) {
      newFiles[path] = replaceInText(content);
    }
  }
  return { code: newCode, files: newFiles };
}

/**
 * Normalize preview metadata so App.js always has valid "function App()" (fixes legacy or AI-dropped "function").
 * Call before sending preview to client so Sandpack receives valid code.
 * @param {object} [metadata] - preview.metadata (may have websitePreviewCode and/or websitePreviewFiles)
 */
export function normalizePreviewMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return;
  if (metadata.websitePreviewCode && typeof metadata.websitePreviewCode === "string") {
    metadata.websitePreviewCode = normalizeComponentCode(metadata.websitePreviewCode);
  }
  const files = metadata.websitePreviewFiles;
  if (files && typeof files === "object") {
    for (const [path, content] of Object.entries(files)) {
      if (typeof content === "string" && content.length > 10) {
        files[path] = normalizeComponentCode(content, path);
      }
    }
  }
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

function fixJSXExpressions(code) {
  return code
    // remove semicolons inside JSX braces
    .replace(/\{([^{}]*?);+\}/g, "{$1}")

    // remove trailing commas inside JSX braces
    .replace(/\{([^{}]*?),+\}/g, "{$1}")

    // remove stray periods
    .replace(/\{([^{}]*?)\.\}/g, "{$1}");
}


/**
 * Normalizes AI component code into valid React component.
 * @param {string} code - Raw component code
 * @param {string} [filePath] - Optional path (e.g. "/components/ui/ProductCard.js") to fix export/name when model outputs App instead of filename
 */
export function normalizeComponentCode(code, filePath) {
  if (!code) return "";

  let c = unescapeCode(code);

  // Remove markdown fences
  c = c.replace(/```[\s\S]*?```/g, (m) =>
    m.replace(/```[a-z]*/gi, "").replace(/```/g, "")
  );

  // Fix invalid \u escapes (JS requires \u to be followed by exactly 4 hex digits; otherwise treat as literal \u)
  c = c.replace(/\\u(?!([0-9a-fA-F]{4}))/g, "\\\\u");

  // Fix escaped quotes AI sometimes outputs
  c = c.replace(/\\'(?=\s*[,\]\}])/g, "'");

  // Escape apostrophes inside words (e.g. "word's" -> "word\'s")
  c = c.replace(/([a-zA-Z])'([a-zA-Z])/g, "$1\\'$2");

  // Escape quoted proper nouns inside prose strings (e.g. "little 'Sparkle' is" -> "little \'Sparkle\' is")
  // Do NOT escape when 'Word' is a direct value (object prop, array element, etc.) — skip if preceded by : , [ ( { =
  c = c.replace(/(?<![:\,\[\(\{\=]\s*)(\s)'([A-Z][a-zA-Z0-9_]*)'(\s)/g, (m, before, word, after) =>
    `${before}\\'${word}\\'${after}`);

  // Fix objects ending with semicolon
  c = c.replace(/'\s*;/g, "'");

  // Fix extra braces before export
  c = c.replace(/\}\}\s*export default/g, "}\nexport default");

  // Fix missing "function" before App — Gemini 2.5 often outputs " App() {" or " App() => {" or " App () {"
  if (!c.includes("function App") && !c.includes("const App")) {
    c = c.replace(/(^|\n)(\s*)App\s*\(\s*\)\s*(=>\s*)?\{/gm, "$1$2function App() {");
  }
  // Fix invalid "function App() => {" (function keyword + arrow) → "function App() {"
  c = c.replace(/function App\s*\(\s*\)\s*=>\s*\{/g, "function App() {");

  // Fix missing "export default function" before page/component names and bare "App(" / "ProductCard(" in non-root files (^|\n) so start-of-file is fixed too
  const componentNames = "Header|Footer|HomePage|AboutPage|ProductsPage|ServicesPage|ContactPage|ProductCard|App";
  c = c.replace(new RegExp(`(^|\\n)(\\s*)(${componentNames})(\\s*)(\\()`, "g"), (m, start, sp, name, sp2, paren, offset, fullString) => {
    const lineStart = offset > 0 ? fullString.lastIndexOf("\n", offset - 1) + 1 : 0;
    const line = fullString.slice(lineStart, offset);
    if (new RegExp(`(?:function|export\\s+default\\s+function|const)\\s+${name}\\b`).test(line)) return m;
    return `${start}${sp}export default function ${name}${sp2}${paren}`;
  });
  c = c.replace(/export default function export default function /g, "export default function ");

  // Fix wrong "export default App" when this file's main component is Header, Footer, ProductCard, etc. (replace all occurrences)
  const mainExportMatch = c.match(/export default function (Header|Footer|HomePage|AboutPage|ProductsPage|ServicesPage|ContactPage|ProductCard)\s*\(/);
  if (mainExportMatch) {
    const correctName = mainExportMatch[1];
    c = c.replace(/\bexport default App\s*;?/g, `export default ${correctName};`);
  }

  // When path indicates a non-root file (e.g. ProductCard.js), fix App → path-derived name if model exported App
  if (filePath && !/(^|\/)App\.(js|jsx)$/.test(filePath) && c.includes("export default App")) {
    const base = filePath.replace(/.*\//, "").replace(/\.(js|jsx)$/, "");
    const expectedName = base && /^[A-Z][a-zA-Z0-9]*$/.test(base) ? base : null;
    if (expectedName) {
      c = c.replace(/\bexport default function App\s*\(/g, `export default function ${expectedName}(`);
      c = c.replace(/\bfunction App\s*\(/g, `function ${expectedName}(`);
      c = c.replace(/\bexport default App\s*;?/g, `export default ${expectedName};`);
    }
  }

  // Ensure component name = App only in root App.js (when no other export default function X is present)
  const hasOtherExportDefaultFunction = /export default function (?:Header|Footer|HomePage|AboutPage|ProductsPage|ServicesPage|ContactPage|ProductCard)\s*\(/.test(c);
  if (!hasOtherExportDefaultFunction && !c.includes("function App") && !c.includes("const App")) {
    c = c.replace(
      /(function|const|class)\s+([A-Z][a-zA-Z0-9_]*)/,
      "$1 App"
    );
  }

  // Ensure export default App only when this is the root app (no other main component)
  if (!hasOtherExportDefaultFunction && !c.includes("export default App")) {
    c = c.replace(/export default\s+\w+;?/g, "");
    if (!c.endsWith(";")) c += ";";
    c += "\n\nexport default App;";
  }

  /* -------------------------------------- */
  /* JSX EXPRESSION SANITIZER (CRITICAL)   */
  /* fixes Gemini 2.5 JSX syntax mistakes  */
  /* -------------------------------------- */
  c = c
    .replace(/\{([^{}]*?);+\}/g, "{$1}")   // {value;} → {value}
    .replace(/\{([^{}]*?),+\}/g, "{$1}")   // {value,} → {value}
    .replace(/\{([^{}]*?)\.\}/g, "{$1}")   // {value.} → {value}
    .replace(/\{;\}/g, "{}");              // {;} → {}

  /* -------------------------------------- */
  /* FINAL JS SAFETY PASS                   */
  /* -------------------------------------- */
  c = safeSyntaxFix(c);

  return c.trim();
}


/**
 * Find the index of the closing quote for the "code" JSON string value.
 * Respects backslash escapes (\" and \\) so we don't truncate at a quote inside the code.
 * Only treats a quote as closing if it's followed by optional whitespace and then , or }.
 */
function findCodeStringEnd(text, valueStart) {
  let i = valueStart;
  while (i < text.length) {
    if (text[i] === "\\") {
      i += 2; // skip backslash and escaped char
      continue;
    }
    if (text[i] === '"') {
      const after = text.substring(i + 1).match(/^\s*[,}]/);
      if (after) return i;
      // Unescaped quote not followed by , or } — malformed, treat as content and continue
    }
    i++;
  }
  return -1;
}

/**
 * Try to extract a string value for key "key" (e.g. "/App.js" or "code") in text.
 * Looks for "key": " and then finds the closing quote (escape-aware).
 */
function extractStringValue(text, key) {
  const quoted = `"${key}":`;
  const idx = text.indexOf(quoted);
  if (idx === -1) return null;
  const valueStart = text.indexOf('"', idx + quoted.length);
  if (valueStart === -1) return null;
  const start = valueStart + 1;
  const end = findCodeStringEnd(text, start);
  if (end === -1) return null;
  return text.substring(start, end);
}

/**
 * Try to extract React component code from raw text (e.g. when response is not valid JSON).
 */
function extractReactCodeFromRaw(text) {
  if (!text || text.length < 50) return "";
  const hasApp = text.includes("function App") || text.includes("const App ");
  const hasExport = text.includes("export default App");
  if (!hasApp && !hasExport) return "";
  const idxImport = text.indexOf("import ");
  const idxFunctionApp = text.indexOf("function App");
  const idxConstApp = text.indexOf("const App ");
  const candidates = [idxImport, idxFunctionApp, idxConstApp].filter((i) => i !== -1);
  if (candidates.length === 0) return "";
  const start = Math.min(...candidates);
  const exportIdx = text.indexOf("export default App");
  const end = exportIdx !== -1 ? text.indexOf(";", exportIdx) + 1 : text.length;
  if (end <= start) return "";
  return text.substring(start, end).trim();
}

/** Known file paths in multi-file AI output (try both with and without leading slash). */
const KNOWN_FILE_PATHS = [
  "/App.js",
  "/components/Header.js",
  "/components/Footer.js",
  "/pages/HomePage.js",
  "/pages/AboutPage.js",
  "/pages/ServicesPage.js",
  "/pages/ProductsPage.js",
  "/pages/ContactPage.js",
];

/**
 * Extract "files" object from raw text by pulling each known path's string value.
 * Returns object with norm path -> raw content (unescaping done later in main parser).
 */
function extractFilesFromRawText(text) {
  if (!text || text.indexOf('"files"') === -1) return null;
  const out = {};
  for (const path of KNOWN_FILE_PATHS) {
    const content = extractStringValue(text, path) || extractStringValue(text, path.slice(1));
    if (content && content.length > 10) out[path] = content;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Manual recovery if JSON.parse fails.
 * Tries: extract "code", then "files" -> "/App.js", then raw React-like block.
 * When "files" is present, also extracts all known file paths so components/pages are not lost.
 */
function repairAndParseManual(text) {
  let code = null;
  let files = null;

  const codeStart = text.indexOf('"code"');
  if (codeStart !== -1) {
    const firstQuote = text.indexOf('"', codeStart + 6);
    if (firstQuote !== -1) {
      const start = firstQuote + 1;
      const end = findCodeStringEnd(text, start);
      const lastBrace = text.lastIndexOf("}");
      code = end !== -1
        ? text.substring(start, end)
        : text.substring(start, Math.max(start, lastBrace));
    }
  }

  if (text.indexOf('"files"') !== -1) {
    files = extractFilesFromRawText(text);
    if (!code && files) code = files["/App.js"] || files["App.js"] || null;
    if (!code) code = extractStringValue(text, "/App.js") || extractStringValue(text, "App.js");
  }

  if (!code || code.length < 20) {
    const rawCode = extractReactCodeFromRaw(text);
    if (rawCode.length > 100) code = rawCode;
  }

  if (!code) {
    const looksLikeJson = text.trim().startsWith("{") && (text.includes('"analysis"') || text.includes('"files"'));
    return {
      analysis: "No JSON detected. Using raw response.",
      code: looksLikeJson ? "" : text,
    };
  }

  const result = { analysis: "Recovered manually", code };
  if (files) result.files = files;
  return result;
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

  // Remove control chars except \n and \r so pretty-printed JSON isn't corrupted
  clean = clean.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, "");

  let parsed;

  try {
    parsed = JSON.parse(clean);
  } catch {
    parsed = repairAndParseManual(clean);
  }

  // Multi-file: prefer "files" object; normalize each file and keep "code" as App.js for display/legacy
  if (parsed.files && typeof parsed.files === "object") {
    const normalized = {};
    for (const [path, content] of Object.entries(parsed.files)) {
      if (typeof content !== "string") continue;
      const normPath = path.startsWith("/") ? path : `/${path}`;
      let c = unescapeCode(content);
      c = fixBrokenImageSrc(c);
      c = c.replace(/^```[a-z]*\n?/gi, "").replace(/\n?```$/i, "").trim();
      c = normalizeComponentCode(c, normPath);
      normalized[normPath] = c;
    }
    parsed.files = normalized;
    const appCode = normalized["/App.js"] || "";
    parsed.code = appCode || parsed.code || "";
  }

  if (parsed.code) {
    if (!parsed.files) {
      parsed.code = normalizeComponentCode(parsed.code);
      parsed.code = fixBrokenImageSrc(parsed.code);
    }
  }

  // Never use full JSON as code (e.g. model put whole response in "code" or App.js)
  const codeTrim = (parsed.code || "").trim();
  if (
    codeTrim.startsWith("{") &&
    (codeTrim.includes('"analysis"') || codeTrim.includes('"files"'))
  ) {
    parsed.code = parsed.files?.["/App.js"] || "";
  }

  return parsed;
}
