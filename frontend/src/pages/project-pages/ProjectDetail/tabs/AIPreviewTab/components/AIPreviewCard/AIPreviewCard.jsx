import { useState, useMemo, useCallback, memo } from 'react'
import { Button, Card, CardHeader, CardContent } from '../../../../../../../components/ui-components'
import { getCodesandboxEmbed } from '../../../../../../../services/aiPreviewApi'

// Helpers (pure, stable) — same parsing logic, used inside useMemo
const unescapeCode = (str) => {
  if (typeof str !== 'string') return str
  try {
    return JSON.parse(`"${str}"`)
  } catch (e) {
    return str
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
  }
}

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

const FIXED_SANDPACK_FILES = {
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
}

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
  const [embedLoading, setEmbedLoading] = useState(false)
  const editorUrl = cachedEditorUrl || fetchedEditorUrl

  const { effectiveAppCode } = useMemo(() => {
    const cleanCode = unescapeCode(code)
    let sandpackFiles
    if (files && typeof files === 'object' && Object.keys(files).length > 0) {
      const entries = Object.entries(files)
        .filter(([, content]) => typeof content === 'string')
        .map(([path, content]) => {
          const normPath = path.startsWith('/') ? path : `/${path}`
          let fileCode = unescapeCode(content)
          if (isJsonLike(fileCode)) fileCode = ''
          return [normPath, { code: fileCode }]
        })
        .filter(([, { code: c }]) => c !== '')
      const byPath = Object.fromEntries(entries)
      let appCode = byPath['/App.js']?.code || ''
      if (!appCode && cleanCode) {
        appCode = isJsonLike(cleanCode) ? extractAppCodeFromJson(cleanCode) : cleanCode
        if (appCode) byPath['/App.js'] = { code: appCode }
      }
      sandpackFiles = { ...byPath, ...FIXED_SANDPACK_FILES }
    } else {
      const appCode = isJsonLike(cleanCode) ? extractAppCodeFromJson(cleanCode) : cleanCode
      sandpackFiles = {
        '/App.js': { code: appCode || '' },
        ...FIXED_SANDPACK_FILES,
      }
    }
    const effectiveAppCode = sandpackFiles['/App.js']?.code || ''
    return { effectiveAppCode }
  }, [code, files])

  const handleCardClick = useCallback(() => {
    if (editorUrl) {
      window.open(editorUrl, '_blank')
      return
    }
    if (!effectiveAppCode || embedLoading) return
    setEmbedLoading(true)
    getCodesandboxEmbed(previewId)
      .then((data) => {
        if (data?.editorUrl) {
          setFetchedEditorUrl(data.editorUrl)
          window.open(data.editorUrl, '_blank')
        }
      })
      .catch((err) => {
        console.warn('CodeSandbox embed fetch failed:', previewId, err?.message || err)
      })
      .finally(() => setEmbedLoading(false))
  }, [editorUrl, effectiveAppCode, embedLoading, previewId])

  const isClickable = !!editorUrl || (effectiveAppCode && !embedLoading)

  return (
    <Card
      className={`rounded-none border-border overflow-hidden w-[240px] transition-colors shrink-0 ${isClickable ? 'cursor-pointer hover:border-primary/50' : 'cursor-default'}`}
      onClick={handleCardClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick() } }}
      role="button"
      tabIndex={isClickable ? 0 : -1}
      aria-label={embedLoading ? 'Opening…' : (editorUrl ? `Open preview in Sandbox: ${preview.prompt?.substring(0, 40) ?? 'Preview'}` : 'Preview')}
    >
      <CardHeader className="min-h-[40px] px-2 py-2 flex flex-row items-center gap-2 flex-wrap border-b border-border bg-muted/30">
        <span className="font-heading text-xs text-ink min-w-0 flex-1 truncate uppercase" title={preview.prompt}>
          {preview.prompt?.substring(0, 40)}{preview.prompt?.length > 40 ? '…' : ''}
        </span>
        <span className={`font-heading text-[10px] uppercase shrink-0 px-1.5 py-0.5 border border-border ${preview.status === 'completed' ? 'bg-primary/10 text-primary border-primary/30' : 'bg-muted/50 text-ink-muted'}`}>
          {preview.status}
        </span>
      </CardHeader>
      <CardContent className="p-0">
        {effectiveAppCode ? (
          <>
            <div
              className="h-[120px] w-full border-b border-border bg-muted/50 flex items-center justify-center overflow-hidden"
              aria-hidden
            >
              {embedLoading ? (
                <span className="font-body text-xs text-ink-muted">Opening…</span>
              ) : thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt=""
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <span className="font-body text-xs text-ink-muted">Preview screenshot</span>
              )}
            </div>
            <div className="flex flex-col gap-1.5 p-2" onClick={(e) => e.stopPropagation()}>
              <span className="text-[10px] text-ink-muted font-body uppercase tracking-wide">
                {new Date(preview.createdAt).toLocaleString()}
              </span>
              {!isClientOwner ? (
                <div className="flex flex-wrap gap-1.5">
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
                </div>
              ) : (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  className="text-xs h-8 w-full"
                  onClick={() => onDeletePreview(previewId)}
                >
                  Delete preview
                </Button>
              )}
            </div>
          </>
        ) : (
          <p className="font-body text-xs text-ink-muted p-2">No preview code available.</p>
        )}
      </CardContent>
    </Card>
  )
}

export default memo(AIPreviewCard)
