import { useState } from 'react'
import { Button } from '../../../../../../../components/ui-components'
import { parsePreviewResult, buildPreviewIframeSrcDoc } from '../../../../utils/previewUtils'
import './AIPreviewCard.css'

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
                <div className="project-preview-iframe-wrap">
                  <iframe
                    title="Website Preview"
                    sandbox="allow-scripts allow-same-origin"
                    srcDoc={buildPreviewIframeSrcDoc(code)}
                    className="project-preview-iframe"
                  />
                </div>
                <div className="project-preview-code-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onCopyCode(previewId, code)}
                  >
                    {copySuccessId === previewId ? 'Copied!' : 'Copy code'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onDownloadCode(code)}
                  >
                    Download ZIP
                  </Button>
                </div>
              </div>
            </>
          )}
          {isClientOwner && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              className="btn btn-danger btn-sm project-preview-delete"
              onClick={() => onDeletePreview(previewId)}
            >
              Delete preview
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default AIPreviewCard
