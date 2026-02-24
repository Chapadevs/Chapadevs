import { useState, useEffect, useCallback } from 'react'
import { Button, Card, CardHeader, CardContent } from '../../../../../../../components/ui-components'
import { getCodesandboxEmbed } from '../../../../../../../services/aiPreviewApi'
import './AIPreviewCard.css'

const AIPreviewCard = ({
  preview,
  copySuccessId,
  isClientOwner,
  onCopyCode,
  onDownloadCode,
  onDeletePreview,
}) => {
  const previewId = preview._id || preview.id
  const code = preview.metadata?.websitePreviewCode || ''
  const files = preview.metadata?.websitePreviewFiles || null
  const thumbnailUrl = preview.metadata?.previewThumbnailUrl || null
  const cachedEditorUrl = preview.metadata?.codesandboxEditorUrl ||
    (preview.metadata?.codesandboxSandboxId ? `https://codesandbox.io/s/${preview.metadata.codesandboxSandboxId}` : null)
  const [fetchedEditorUrl, setFetchedEditorUrl] = useState(null)
  const editorUrl = cachedEditorUrl || fetchedEditorUrl

  // Helper to unescape string-encoded code (fixes literal \n and \")
  const unescapeCode = (str) => {
    if (typeof str !== 'string') return str;
    try {
      return JSON.parse(`"${str}"`);
    } catch (e) {
      return str
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }
  };

  const cleanCode = unescapeCode(code)

  const isJsonLike = (str) => {
    const s = (str || '').trim()
    return s.length > 20 && s.startsWith('{') && (s.includes('"analysis"') || s.includes('"files"'))
  }

  const extractAppCodeFromJson = (raw) => {
    if (!raw || typeof raw !== 'string') return ''
    const s = raw.trim()
    if (!s.startsWith('{') || (!s.includes('"analysis"') && !s.includes('"files"'))) return ''
    try {
      const parsed = JSON.parse(s)
      const files = parsed?.files && typeof parsed.files === 'object' ? parsed.files : {}
      return files['/App.js'] || files['App.js'] || (typeof parsed.code === 'string' && !isJsonLike(parsed.code) ? parsed.code : '') || ''
    } catch {
      return ''
    }
  }

  const fixedSandpackFiles = {
    '/index.js': {
      code: `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = createRoot(document.getElementById("root"));
root.render(<App />);`.trim(),
    },
    '/index.css': {
      code: `@tailwind base;
@tailwind components;
@tailwind utilities;`.trim(),
    },
    '/tailwind.config.js': {
      code: `module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};`.trim(),
    },
    '/public/index.html': {
      code: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React + Tailwind Preview</title>
  </head>
  <body>
    <div id="root"></div>
    <script src="https://cdn.tailwindcss.com"></script>
  </body>
</html>`.trim(),
    },
  };

  const sandpackFiles = (() => {
    let appCode = ''
    if (files && typeof files === 'object' && Object.keys(files).length > 0) {
      const entries = Object.entries(files)
        .filter(([, content]) => typeof content === 'string')
        .map(([path, content]) => {
          const normPath = path.startsWith('/') ? path : `/${path}`
          let fileCode = unescapeCode(content)
          if (isJsonLike(fileCode)) fileCode = ''
          return [normPath, { code: fileCode }]
        })
        .filter(([, { code }]) => code !== '')
      const byPath = Object.fromEntries(entries)
      appCode = byPath['/App.js']?.code || ''
      if (!appCode && cleanCode) {
        appCode = isJsonLike(cleanCode) ? extractAppCodeFromJson(cleanCode) : cleanCode
        if (appCode) byPath['/App.js'] = { code: appCode }
      }
      return { ...byPath, ...fixedSandpackFiles }
    }
    appCode = isJsonLike(cleanCode) ? extractAppCodeFromJson(cleanCode) : cleanCode
    return {
      '/App.js': { code: appCode || '' },
      ...fixedSandpackFiles,
    }
  })()

  const effectiveAppCode = sandpackFiles['/App.js']?.code || ''

  // Use cached CodeSandbox URL from metadata when present; otherwise fetch once per preview.
  useEffect(() => {
    if (!effectiveAppCode) return
    if (cachedEditorUrl || fetchedEditorUrl) return
    let cancelled = false
    getCodesandboxEmbed(previewId)
      .then((data) => {
        if (!cancelled && data?.editorUrl) setFetchedEditorUrl(data.editorUrl)
      })
      .catch((err) => {
        if (!cancelled) console.warn('CodeSandbox embed fetch failed:', previewId, err?.message || err)
      })
    return () => { cancelled = true }
  }, [effectiveAppCode, previewId, fetchedEditorUrl, cachedEditorUrl])

  const handleCardClick = useCallback(() => {
    if (editorUrl) window.open(editorUrl, '_blank')
  }, [editorUrl])

  return (
    <Card
      className={`rounded-none border-border overflow-hidden project-preview-card max-w-md transition-colors ${editorUrl ? 'cursor-pointer hover:border-primary/50' : 'cursor-default'}`}
      onClick={handleCardClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick() } }}
      role="button"
      tabIndex={editorUrl ? 0 : -1}
      aria-label={editorUrl ? `Open preview in Sandbox: ${preview.prompt?.substring(0, 40) ?? 'Preview'}` : 'Preview'}
    >
      <CardHeader className="p-2 flex flex-row items-center gap-2 flex-wrap">
        <span className="text-[10px] text-ink-muted font-body shrink-0">
          {new Date(preview.createdAt).toLocaleString()}
        </span>
        <span className="font-body text-xs text-ink min-w-0 flex-1 truncate" title={preview.prompt}>
          {preview.prompt?.substring(0, 40)}{preview.prompt?.length > 40 ? '…' : ''}
        </span>
        <span className={`project-preview-status project-preview-status--${preview.status} shrink-0 text-[10px]`}>
          {preview.status}
        </span>
      </CardHeader>
      <CardContent className="p-2 pt-0 project-preview-card-body">
        {effectiveAppCode ? (
          <>
            <div
              className="h-20 w-full border border-border bg-muted/50 rounded-none flex items-center justify-center overflow-hidden"
              aria-hidden
            >
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt=""
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <span className="font-body text-xs text-ink-muted">Preview screenshot</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
              {!isClientOwner && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => onCopyCode(previewId, effectiveAppCode)}
                  >
                    {copySuccessId === previewId ? 'Copied!' : 'Copy code'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => onDownloadCode(effectiveAppCode)}
                  >
                    Download ZIP
                  </Button>
                </>
              )}
              {isClientOwner && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={() => onDeletePreview(previewId)}
                >
                  Delete preview
                </Button>
              )}
            </div>
          </>
        ) : (
          <p className="font-body text-xs text-ink-muted py-2">No preview code available.</p>
        )}
      </CardContent>
    </Card>
  )
}

export default AIPreviewCard
