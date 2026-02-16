import { useState } from 'react'
import { Button } from '../../../../../../../components/ui-components'
import { parsePreviewResult } from '../../../../utils/previewUtils'
import './AIPreviewCard.css'
import { Sandpack } from "@codesandbox/sandpack-react"

const AIPreviewCard = ({
  preview,
  isExpanded,
  copySuccessId,
  isClientOwner,
  onToggleExpand,
  onCopyCode,
  onDownloadCode,
  onDeletePreview,
}) => {
  const previewId = preview._id || preview.id
  const code = preview.metadata?.websitePreviewCode || ''
  const [analysisOpen, setAnalysisOpen] = useState(false)

  const renderPreviewAnalysis = (preview) => {
    const result = parsePreviewResult(preview.previewResult)
    if (!result) return <p className="project-preview-empty">No analysis content.</p>
    if (result.raw) return <p className="project-preview-analysis">{result.raw}</p>
    const tech = result.techStack
    const frontend = Array.isArray(tech?.frontend) ? tech.frontend : []
    const backend = Array.isArray(tech?.backend) ? tech.backend : []
    return (
      <div className="project-preview-analysis">
        {result.overview && <p><strong>Overview:</strong> {result.overview}</p>}
        {result.features?.length > 0 && (
          <div>
            <strong>Features:</strong>
            <ul>{result.features.map((f, i) => <li key={i}>{f}</li>)}</ul>
          </div>
        )}
        {(frontend.length > 0 || backend.length > 0) && (
          <div>
            <strong>Tech stack:</strong>
            {frontend.length > 0 && <p><strong>Frontend:</strong> {frontend.join(', ')}</p>}
            {backend.length > 0 && <p><strong>Backend:</strong> {backend.join(', ')}</p>}
          </div>
        )}
      </div>
    )
  }

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

  const cleanCode = unescapeCode(code);

  // Sandpack setup for React template + Tailwind
  const sandpackFiles = {
    "/App.js": {
      code: cleanCode
    },
    "/index.js": {
      code: `
    import React from "react";
    import { createRoot } from "react-dom/client";
    import App from "./App";
    import "./index.css";

    const root = createRoot(document.getElementById("root"));
    root.render(<App />);
          `.trim()
        },
        "/index.css": {
          code: `
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
      `.trim()
    },
    // Empty tailwind.config.js for Sandpack to recognize Tailwind imports (no actual config needed for CDN base)
    "/tailwind.config.js": {
      code: `
    module.exports = {
      content: ["./src/**/*.{js,jsx,ts,tsx}"],
      theme: { extend: {} },
      plugins: [],
    };
          `.trim()
        },
        "/public/index.html": {
          code: `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <link rel="icon" href="favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>React + Tailwind Preview</title>
      </head>
      <body>
        <div id="root"></div>
        <!-- Tailwind via CDN for fast preview -->
        <script src="https://cdn.tailwindcss.com"></script>
      </body>
    </html>
      `.trim()
    }
  };

  return (
    <div className="project-preview-card">
      <div
        className="project-preview-card-header"
        onClick={onToggleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onToggleExpand()}
      >
        <span className="project-preview-date">
          {new Date(preview.createdAt).toLocaleString()}
        </span>
        <span className="project-preview-prompt">
          {preview.prompt?.substring(0, 80)}{preview.prompt?.length > 80 ? '...' : ''}
        </span>
        <span className={`project-preview-status project-preview-status--${preview.status}`}>
          {preview.status}
        </span>
        <span className="project-preview-expand">{isExpanded ? '▼' : '▶'}</span>
      </div>
      {isExpanded && (
        <div className="project-preview-card-body">
          <div className="project-preview-tab">
            <Button
              type="button"
              variant="ghost"
              className="project-preview-analysis-toggle"
              onClick={() => setAnalysisOpen((prev) => !prev)}
              aria-expanded={analysisOpen}
            >
              <span className="project-preview-analysis-toggle-label">
                {analysisOpen ? 'Hide' : 'View'} overview
              </span>
              <span className="project-preview-analysis-toggle-icon" aria-hidden>
                {analysisOpen ? '▼' : '▶'}
              </span>
            </Button>
            {analysisOpen && (
              <div className="project-preview-analysis-wrap">
                {renderPreviewAnalysis(preview)}
              </div>
            )}
          </div>
          {code && (
            <>
              <div className="project-preview-iframe-block">
                <h4>Website Preview</h4>
                <div className="project-preview-iframe-wrap" style={{ minHeight: 320 }}>
                  {/* Use Sandpack with react template and Tailwind included */}
                  <Sandpack
                    template="react"
                    files={sandpackFiles}
                    options={{
                      showNavigator: true,
                      showPreview: false, // Hide the right-side preview
                    }}
                  />
                </div>
                <div className="project-preview-code-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onCopyCode(previewId, code)}
                  >
                    {copySuccessId === previewId ? 'Copied!' : 'Copy code'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onDownloadCode(code)}
                  >
                    Download ZIP
                  </Button>
                  {isClientOwner && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => onDeletePreview(previewId)}
                    >
                      Delete preview
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default AIPreviewCard
