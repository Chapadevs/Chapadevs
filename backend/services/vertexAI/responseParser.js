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

/**
 * Manual recovery if JSON.parse fails.
 * Tries: extract "code", then "files" -> "/App.js", then raw React-like block.
 */
function repairAndParseManual(text) {
  let code = null;

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

  if (!code && text.indexOf('"files"') !== -1) {
    code = extractStringValue(text, "/App.js") || extractStringValue(text, "App.js");
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
      if (normPath === "/App.js") {
        c = normalizeComponentCode(c);
      } else {
        c = c.replace(/^```[a-z]*\n?/gi, "").replace(/\n?```$/i, "").trim();
      }
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
