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
  const allowlist = ["picsum.photos", "placehold.co", "placeholder.com", "data:image/", "storage.googleapis.com"];

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
 * urls[0]=logo (image-1), urls[1]=hero (image-2), urls[2]=display (image-3).
 * Replaces __LOGO__ with urls[0], __IMAGE_1__ with urls[1] (hero), __IMAGE_2__/3 with urls[2] (display).
 * __IMAGE_4__–6 cycle hero and display.
 * @param {string} code - Single App.js code string
 * @param {object|null} files - Optional files object (path -> content)
 * @param {string[]} dataUrls - Array of 3 URLs: [logo, hero, display]
 * @returns {{ code: string, files: object|null }}
 */
export function injectGeneratedImages(code, files, dataUrls) {
  const displayFallback = "https://placehold.co/400x300?text=Image";
  const heroFallback = "https://placehold.co/1200x600?text=Hero";
  const logoFallback = "https://placehold.co/96x96?text=Logo";
  let urls = Array.isArray(dataUrls) ? dataUrls : [];
  const defaults = [logoFallback, heroFallback, displayFallback];
  while (urls.length < 3) urls.push(defaults[urls.length]);
  urls = urls.slice(0, 3);
  const valid = (u) =>
    typeof u === "string" &&
    u.trim().length > 0 &&
    (u.startsWith("data:image/") || u.startsWith("https://"));
  const getUrl = (slotIndex0Based) => {
    // urls[0]=logo, urls[1]=hero, urls[2]=display. __IMAGE_1__→hero, __IMAGE_2__/3→display, __IMAGE_4__+→cycle hero/display.
    let idx = slotIndex0Based === 0 ? 1 : 2; // __IMAGE_1__→hero, __IMAGE_2__/3→display
    if (slotIndex0Based >= 3) idx = 1 + ((slotIndex0Based - 3) % 2); // __IMAGE_4__+ cycle hero, display
    const u = valid(urls[idx]) ? urls[idx] : displayFallback;
    return u && u.trim() ? u.trim() : displayFallback;
  };
  const getLogoUrl = () => (valid(urls[0]) ? urls[0].trim() : logoFallback);

  /**
   * Fix AI misuse: when it outputs __IMAGE_1__ for the header logo, replace with __LOGO__
   * so the logo gets urls[0] (image-1) instead of urls[1] (hero).
   * Uses flexible src regex to handle attribute order and optional whitespace.
   */
  const fixLogoMisuse = (text, filePath) => {
    if (!text || typeof text !== "string") return text;
    let out = text;
    // Flexible: src before/after other attrs, optional whitespace
    const image1SrcRegex = () => /src\s*=\s*["']\s*__IMAGE_1__\s*["']/g;
    const replaceLogo = (s) => s.replace(image1SrcRegex(), 'src="__LOGO__"');
    const hasImage1InLogoContext = (s) => image1SrcRegex().test(s);
    // 1. Inside <header> or <nav>: all __IMAGE_1__ there = logo
    out = out.replace(/<(?:header|nav)[^>]*>[\s\S]*?<\/(?:header|nav)>/gi, replaceLogo);
    // 2. In Header.js(x): the only img is the logo
    if (filePath && /\bHeader\.(js|jsx)$/i.test(String(filePath))) {
      out = out.replace(image1SrcRegex(), 'src="__LOGO__"');
    }
    // 3. Inside <button> wrapping logo-style img (e.g. nav home button with logo)
    out = out.replace(/<button[^>]*>[\s\S]*?<\/button>/gi, (block) => {
      if (
        /<img[\s\S]*?>/.test(block) &&
        (/object-contain|w-12|h-12|alt=["'][^"']*logo[^"']*["']/i.test(block)) &&
        hasImage1InLogoContext(block)
      ) {
        return replaceLogo(block);
      }
      return block;
    });
    // 4. Any img with object-contain (logo style) and src=__IMAGE_1__ -> logo. Hero uses object-cover.
    out = out.replace(/<img[\s\S]*?>/gi, (tag) => {
      if (!hasImage1InLogoContext(tag)) return tag;
      if (/object-contain/.test(tag) && !/object-cover/.test(tag)) return replaceLogo(tag);
      if (/\b(?:w-12|h-12)\b/.test(tag) && !/object-cover|w-full/.test(tag)) return replaceLogo(tag);
      if (/alt=["'][^"']*logo[^"']*["']/i.test(tag)) return replaceLogo(tag);
      return tag;
    });
    return out;
  };

  // Replace AI-emitted placehold.co URLs with __IMAGE_N__ so they get real images when dataUrls exist
  const replacePlaceholderUrlsWithImageSlots = (text) => {
    if (!text || typeof text !== "string") return text;
    const placeholdPattern = /https:\/\/placehold\.co\/[^'"]*['"]/g;
    let slot = 0;
    return text.replace(placeholdPattern, (match) => {
      const n = (slot % 3) + 1; // 3 slots: 1=hero, 2=display, 3=display (logo is __LOGO__)
      slot += 1;
      const quote = match.slice(-1);
      return `__IMAGE_${n}__${quote}`;
    });
  };

  const replaceInText = (text, filePath) => {
    if (!text || typeof text !== "string") return text;
    // Run placehold.co conversion BEFORE fixLogoMisuse so converted __IMAGE_1__ can be fixed
    let out = text;
    if (urls.length > 0) {
      out = replacePlaceholderUrlsWithImageSlots(out);
    }
    out = fixLogoMisuse(out, filePath);
    out = out.split("__LOGO__").join(getLogoUrl());
    for (let i = 1; i <= 6; i++) {
      const placeholder = `__IMAGE_${i}__`;
      out = out.split(placeholder).join(getUrl(i - 1));
    }
    return out;
  };

  const newCode = replaceInText(code || "", "/App.js");
  let newFiles = null;
  if (files && typeof files === "object") {
    newFiles = {};
    for (const [path, content] of Object.entries(files)) {
      const normPath = path.startsWith("/") ? path : `/${path}`;
      newFiles[path] = replaceInText(content, normPath);
    }
  }
  return { code: newCode, files: newFiles };
}

/** Minimal ContactPage fallback when AI omits it but App.js imports it. */
const FALLBACK_CONTACT_PAGE = `import React, { useState } from 'react';

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSubmit = (e) => { e.preventDefault(); };
  return (
    <div className="py-16">
      <div className="max-w-2xl mx-auto px-4">
        <h2 className="text-3xl font-bold mb-6">Contact Us</h2>
        <div className="grid gap-4 mb-8 md:grid-cols-3">
          <div className="bg-gray-50 p-4 rounded-lg"><p className="font-semibold">Email</p><p>contact@example.com</p></div>
          <div className="bg-gray-50 p-4 rounded-lg"><p className="font-semibold">Phone</p><p>+1 234 567 8900</p></div>
          <div className="bg-gray-50 p-4 rounded-lg"><p className="font-semibold">Location</p><p>123 Main St</p></div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" name="name" placeholder="Name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-purple-500" />
          <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-purple-500" />
          <input type="text" name="subject" placeholder="Subject" value={formData.subject} onChange={handleChange} className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-purple-500" />
          <textarea name="message" placeholder="Message" rows={4} value={formData.message} onChange={handleChange} className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-purple-500" />
          <button type="submit" className="px-6 py-3 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors">Send</button>
        </form>
      </div>
    </div>
  );
}
`;

/**
 * If App.js imports ContactPage but ContactPage.js is missing from files, add a fallback.
 * Prevents runtime errors when the AI omits the contact page.
 * @param {object} files - websitePreviewFiles object (mutated in place)
 */
export function ensureRequiredFiles(files) {
  if (!files || typeof files !== "object") return;
  const appCode = files["/App.js"] || files["App.js"] || "";
  const needsContactPage =
    /ContactPage|contactPage/.test(appCode) && !files["/pages/ContactPage.js"] && !files["pages/ContactPage.js"];
  if (needsContactPage) {
    files["/pages/ContactPage.js"] = FALLBACK_CONTACT_PAGE;
  }
}

/**
 * Normalize preview metadata so App.js always has valid "function App()" (fixes legacy or AI-dropped "function").
 * Ensures ContactPage.js exists when App imports it but AI omitted it.
 * Call before sending preview to client so Sandpack receives valid code.
 * @param {object} [metadata] - preview.metadata (may have websitePreviewCode and/or websitePreviewFiles)
 */
export function normalizePreviewMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return;
  const files = metadata.websitePreviewFiles;
  if (files && typeof files === "object") {
    ensureRequiredFiles(files);
    for (const [path, content] of Object.entries(files)) {
      if (typeof content === "string" && content.length > 10) {
        files[path] = normalizeComponentCode(content, path);
      }
    }
  }
  if (metadata.websitePreviewCode && typeof metadata.websitePreviewCode === "string") {
    metadata.websitePreviewCode = normalizeComponentCode(metadata.websitePreviewCode);
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
  const componentNames = "Header|Footer|HomePage|AboutPage|ProductsPage|ServicesPage|ContactPage|ProductCard|Card|Button|App";
  c = c.replace(new RegExp(`(^|\\n)(\\s*)(${componentNames})(\\s*)(\\()`, "g"), (m, start, sp, name, sp2, paren, offset, fullString) => {
    const lineStart = offset > 0 ? fullString.lastIndexOf("\n", offset - 1) + 1 : 0;
    const line = fullString.slice(lineStart, offset);
    if (new RegExp(`(?:function|export\\s+default\\s+function|const)\\s+${name}\\b`).test(line)) return m;
    return `${start}${sp}export default function ${name}${sp2}${paren}`;
  });
  c = c.replace(/export default function export default function /g, "export default function ");

  // Fix wrong "export default App" when this file's main component is Header, Footer, ProductCard, etc. (replace all occurrences)
  const mainExportMatch = c.match(/export default function (Header|Footer|HomePage|AboutPage|ProductsPage|ServicesPage|ContactPage|ProductCard|Card|Button)\s*\(/);
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
  const hasOtherExportDefaultFunction = /export default function (?:Header|Footer|HomePage|AboutPage|ProductsPage|ServicesPage|ContactPage|ProductCard|Card|Button)\s*\(/.test(c);
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
