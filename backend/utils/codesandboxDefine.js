/**
 * Build the files payload for CodeSandbox define API from AI preview metadata.
 * Mirrors the file set used in AIPreviewCard (fixed + dynamic files).
 * CodeSandbox format: { [path]: { content: string, isBinary?: boolean } }
 */

import LZString from 'lz-string'
import { unescapeCode } from './codeUtils.js'

function isJsonLike(str) {
  const s = (str || '').trim()
  return s.length > 20 && s.startsWith('{') && (s.includes('"analysis"') || s.includes('"files"'))
}

function extractAppCodeFromJson(raw) {
  if (!raw || typeof raw !== 'string') return ''
  const s = raw.trim()
  if (!s.startsWith('{') || (!s.includes('"analysis"') && !s.includes('"files"'))) return ''
  try {
    const parsed = JSON.parse(s)
    const filesObj = parsed?.files && typeof parsed.files === 'object' ? parsed.files : {}
    return (
      filesObj['/App.js'] ||
      filesObj['App.js'] ||
      (typeof parsed.code === 'string' && !isJsonLike(parsed.code) ? parsed.code : '') ||
      ''
    )
  } catch {
    return ''
  }
}

/** Convert Sandpack-style { code } to CodeSandbox { content } */
function toDefineFile(code) {
  return { content: typeof code === 'string' ? code : '', isBinary: false }
}

const FIXED_FILES = {
  '/package.json': toDefineFile(
    JSON.stringify(
      {
        name: 'preview',
        version: '0.0.1',
        main: 'index.js',
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
        },
      },
      null,
      2
    )
  ),
  '/index.js': toDefineFile(`import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = createRoot(document.getElementById("root"));
root.render(<App />);`.trim()),
  '/index.css': toDefineFile(`@tailwind base;
@tailwind components;
@tailwind utilities;`.trim()),
  '/tailwind.config.js': toDefineFile(`module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./**/*.js"],
  theme: { extend: {} },
  plugins: [],
};`.trim()),
  '/public/index.html': toDefineFile(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React + Tailwind Preview</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Anton&family=Cinzel:wght@400;700&family=Courier+Prime:wght@400;700&family=Fredoka:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Lato:wght@400;700&family=Montserrat:wght@400;500;600;700&family=Open+Sans:wght@400;500;600;700&family=Oswald:wght@400;500;600;700&family=Passion+One&family=Permanent+Marker&family=Playfair+Display:wght@400;500;600;700&family=Raleway:wght@400;500;600;700&family=Roboto:wght@400;500;600;700&family=UnifrakturMaguntia&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script src="https://cdn.tailwindcss.com"></script>
  </body>
</html>`.trim()),
}

/**
 * Build files object for CodeSandbox define API.
 * @param {object} metadata - Preview metadata with websitePreviewCode and/or websitePreviewFiles
 * @returns {{ [path: string]: { content: string, isBinary: boolean } }}
 */
export function buildDefineFiles(metadata) {
  const code = metadata?.websitePreviewCode || ''
  const files = metadata?.websitePreviewFiles || null
  const cleanCode = unescapeCode(code)

  const result = { ...FIXED_FILES }

  if (files && typeof files === 'object' && Object.keys(files).length > 0) {
    for (const [path, content] of Object.entries(files)) {
      if (typeof content !== 'string') continue
      let fileCode = unescapeCode(content)
      if (isJsonLike(fileCode)) fileCode = ''
      if (fileCode === '') continue
      const normPath = path.startsWith('/') ? path : `/${path}`
      result[normPath] = toDefineFile(fileCode)
    }
    let appCode = result['/App.js']?.content
    if (!appCode && cleanCode) {
      appCode = isJsonLike(cleanCode) ? extractAppCodeFromJson(cleanCode) : cleanCode
      if (appCode) result['/App.js'] = toDefineFile(appCode)
    }
  } else {
    const appCode = isJsonLike(cleanCode) ? extractAppCodeFromJson(cleanCode) : cleanCode
    if (appCode) result['/App.js'] = toDefineFile(appCode)
  }

  return result
}

/**
 * Encode files for CodeSandbox define API GET request (lz-string compressed).
 * @param {{ [path: string]: { content: string, isBinary: boolean } }} files
 * @returns {string} Encoded parameters string for query
 */
export function encodeDefineParameters(files) {
  const payload = { files }
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload))
}
