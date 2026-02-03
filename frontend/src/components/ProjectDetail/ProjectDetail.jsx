import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { projectAPI, generateAIPreview, deleteAIPreview } from '../../services/api'
import { TECH_STACK_BY_CATEGORY } from '../../config/techStack'
import JSZip from 'jszip'
import Header from '../Header/Header'
import Timeline from '../Timeline/Timeline'
import './ProjectDetail.css'

const MAX_PREVIEWS_PER_PROJECT = 5

const ProjectDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [markingReady, setMarkingReady] = useState(false)
  const [previews, setPreviews] = useState([])
  const [previewsLoading, setPreviewsLoading] = useState(false)
  const [showGenerateForm, setShowGenerateForm] = useState(false)
  const [generateFormData, setGenerateFormData] = useState({
    prompt: '',
    budget: '',
    timeline: '',
    projectType: '',
    techStack: [],
    modelId: 'gemini-2.0-flash',
  })
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [expandedPreviewId, setExpandedPreviewId] = useState(null)
  const [copySuccessId, setCopySuccessId] = useState(null)
  const [activeTab, setActiveTab] = useState('description')

  useEffect(() => {
    if (!id || id === 'undefined') {
      navigate('/projects', { replace: true })
      return
    }
    loadProject()
  }, [id, navigate])

  useEffect(() => {
    if (project && id) {
      loadPreviews()
    }
  }, [id, project?._id])

  const loadProject = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await projectAPI.getById(id)
      setProject(data)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  const loadPreviews = async () => {
    try {
      setPreviewsLoading(true)
      const data = await projectAPI.getPreviews(id)
      setPreviews(data)
    } catch (err) {
      console.error('Failed to load previews', err)
      setPreviews([])
    } finally {
      setPreviewsLoading(false)
    }
  }

  const handleMarkReady = async () => {
    if (!window.confirm('Mark this project as Ready for assignment?')) {
      return
    }

    try {
      setMarkingReady(true)
      setError(null)
      const updatedProject = await projectAPI.markReady(id)
      setProject(updatedProject)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to mark project as ready')
    } finally {
      setMarkingReady(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }

    try {
      await projectAPI.delete(id)
      navigate('/projects')
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete project')
    }
  }

  const handleGenerateSubmit = async (e) => {
    e.preventDefault()
    if (!generateFormData.prompt.trim()) {
      setGenerateError('Please describe your project')
      return
    }
    setGenerating(true)
    setGenerateError('')
    try {
      const payload = {
        ...generateFormData,
        projectId: id,
        techStack: Array.isArray(generateFormData.techStack)
          ? generateFormData.techStack.join(', ')
          : String(generateFormData.techStack || ''),
      }
      await generateAIPreview(payload)
      await loadPreviews()
      setShowGenerateForm(false)
      setGenerateFormData({ prompt: '', budget: '', timeline: '', projectType: '', techStack: [], modelId: 'gemini-2.0-flash' })
    } catch (err) {
      setGenerateError(err.message || 'Failed to generate preview')
    } finally {
      setGenerating(false)
    }
  }

  const handleDeletePreview = async (previewId) => {
    if (!window.confirm('Delete this AI preview?')) return
    try {
      await deleteAIPreview(previewId)
      await loadPreviews()
    } catch (err) {
      setError(err.message || 'Failed to delete preview')
    }
  }

  const handlePhaseUpdate = (updatedPhase) => {
    setProject((prev) => ({
      ...prev,
      phases: (prev.phases || []).map((p) =>
        (p._id || p.id) === (updatedPhase._id || updatedPhase.id) ? updatedPhase : p
      ),
    }))
    // Reload project to get latest data
    loadProject()
  }

  const handleCopyPreviewCode = async (previewId, code) => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopySuccessId(previewId)
      setTimeout(() => setCopySuccessId(null), 2000)
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  const handleDownloadPreviewCode = async (code) => {
    if (!code) return
    try {
      const zip = new JSZip()
      zip.file('App.js', code)
      zip.file('package.json', JSON.stringify({
        name: 'generated-react-component',
        version: '1.0.0',
        private: true,
        dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0', 'react-scripts': '5.0.1' },
        scripts: { start: 'react-scripts start', build: 'react-scripts build' }
      }, null, 2))
      zip.file('README.md', '# Generated by Chapadevs AI\n\nnpm install\nnpm start')
      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'react-component.zip'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download', err)
    }
  }

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      'Holding': 'status-holding',
      'Ready': 'status-ready',
      'Development': 'status-development',
      'Completed': 'status-completed',
      'Cancelled': 'status-cancelled',
    }
    return statusMap[status] || 'status-default'
  }

  if (loading) {
    return <div className="project-detail-loading">Loading project...</div>
  }

  if (error && !project) {
    return (
      <div className="project-detail-container">
        <div className="error-message">{error}</div>
        <Link to="/projects" className="project-detail-back">← Back to Projects</Link>
      </div>
    )
  }

  if (!project) {
    return <div className="project-detail-container">Project not found</div>
  }

  const userIdStr = (user?._id || user?.id)?.toString()
  const clientIdStr = (project.clientId?._id || project.clientId)?.toString()
  const assignedProgrammerIdStr = (project.assignedProgrammerId?._id || project.assignedProgrammerId)?.toString()
  const isClientOwner = userIdStr && clientIdStr && clientIdStr === userIdStr
  const isAssignedProgrammer = userIdStr && assignedProgrammerIdStr && assignedProgrammerIdStr === userIdStr
  const canEdit = (user?.role === 'client' || user?.role === 'user') && isClientOwner && ['Holding', 'Ready'].includes(project.status)
  const canDelete = (user?.role === 'client' || user?.role === 'user') && isClientOwner && ['Holding', 'Development'].includes(project.status)
  const canMarkReady = (user?.role === 'client' || user?.role === 'user') && isClientOwner && project.status === 'Holding'
  const canGeneratePreviews = isClientOwner && previews.length < MAX_PREVIEWS_PER_PROJECT
  const showAIPreviewsSection = isClientOwner || isAssignedProgrammer

  const parsePreviewResult = (previewResult) => {
    if (!previewResult) return null
    try {
      return JSON.parse(previewResult)
    } catch {
      return { raw: previewResult }
    }
  }

  const buildPreviewIframeSrcDoc = (websiteCode) => {
    if (!websiteCode) return ''
    let code = websiteCode
    
    // Unescape if the code is stored as a JSON string (double-escaped)
    try {
      // Try to parse as JSON string first (handles double-escaped strings)
      if (code.startsWith('"') && code.endsWith('"')) {
        code = JSON.parse(code)
      }
    } catch (e) {
      // Not a JSON string, continue with original code
    }
    
    // Replace escaped newlines with actual newlines
    code = code.replace(/\\n/g, '\n')
    code = code.replace(/\\t/g, '\t')
    code = code.replace(/\\r/g, '\r')
    code = code.replace(/\\"/g, '"')
    code = code.replace(/\\\\/g, '\\')
    
    code = code.replace(/```jsx?\n?/g, '').replace(/```\n?/g, '')
    code = code.replace(/function\s+App\s*\(\)\s*=>/g, 'function App()')
    code = code.replace(/const GeneratedComponent\s*=\s*\(\)\s*=>/g, 'function App()')
    code = code.replace(/const GeneratedComponent\s*=/g, 'function App')
    code = code.replace(/export default GeneratedComponent;?/g, 'export default App;')
    code = code.replace(/export default function GeneratedComponent\(\)/g, 'export default function App()')
    code = code.replace(/function GeneratedComponent\(\)/g, 'function App()')
    code = code.replace(/GeneratedComponent/g, 'App')
    if (!code.includes('export default App')) {
      code = code.replace(/export default \w+;?/g, 'export default App;')
    }
    
    // Remove import statements (we'll use CDN React)
    code = code.replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '')
    code = code.replace(/^import\s+.*?;?\s*$/gm, '')
    
    // Remove export default but keep all component definitions
    // Find where export default App is and remove just that line
    code = code.replace(/export\s+default\s+App;?\s*$/gm, '')
    
    // Ensure we have all the code including helper components
    // The code should now contain all component definitions and the App component
    let componentCode = code.trim()
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}</style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState } = React;
    
    ${componentCode}
    
    // Ensure App is available
    if (typeof App === 'undefined') {
      console.error('App component is not defined. Check your code.');
      console.error('Available components:', Object.keys(window).filter(k => typeof window[k] === 'function'));
    }
    const AppComponent = App;
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(AppComponent));
  </script>
</body>
</html>`
  }

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
    <>
      <Header />
      <div className="project-detail-container">
      <div className="project-detail-header">
        <div>
          <Link to="/projects" className="project-detail-back">← Back to Projects</Link>
          <h1>{project.title}</h1>
          <div className="project-header-meta">
            <span className={`status-badge ${getStatusBadgeClass(project.status)}`}>
              {project.status}
            </span>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="project-detail-content">
        <div className="project-main">
          {activeTab === 'description' && (
            <>
              <div className="project-actions">
                {canMarkReady && (
                  <button
                    onClick={handleMarkReady}
                    className="btn btn-primary"
                    disabled={markingReady}
                  >
                    {markingReady ? 'Marking...' : 'Mark as Ready'}
                  </button>
                )}
                {canDelete && (
                  <button onClick={handleDelete} className="btn btn-danger">
                    Delete Project
                  </button>
                )}
              </div>

              <section className="project-section project-info-section">
                <h2>Project Information</h2>
                <div className="project-info-grid">
                  <div className="info-item">
                    <strong>Client:</strong>
                    <span>{project.clientId?.name ?? 'N/A'}</span>
                  </div>
                  {project.assignedProgrammerId && (
                    <div className="info-item">
                      <strong>Assigned Programmer:</strong>
                      <span>{project.assignedProgrammerId.name}</span>
                    </div>
                  )}
                  {project.phases && project.phases.length > 0 && (
                    <div className="info-item">
                      <strong>Progress:</strong>
                      <span>
                        {project.phases.filter((p) => p.status === 'completed').length} / {project.phases.length} phases
                      </span>
                    </div>
                  )}
                  {project.budget && (
                    <div className="info-item">
                      <strong>Budget:</strong>
                      <span>{project.budget}</span>
                    </div>
                  )}
                  {project.timeline && (
                    <div className="info-item">
                      <strong>Timeline:</strong>
                      <span>{project.timeline}</span>
                    </div>
                  )}
                  {project.startDate && (
                    <div className="info-item">
                      <strong>Start Date:</strong>
                      <span>{new Date(project.startDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {project.dueDate && (
                    <div className="info-item">
                      <strong>Due Date:</strong>
                      <span>{new Date(project.dueDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="info-item">
                    <strong>Created:</strong>
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </section>

              <section className="project-section project-overview">
                <div className="project-overview-row">
                  {project.projectType && (
                    <span className="project-overview-type">{project.projectType}</span>
                  )}
                  {(project.goals?.length > 0 || project.features?.length > 0) && (
                    <div className="project-overview-meta">
                      <span className="project-overview-badges">
                        {project.goals?.length > 0 && (
                          <span className="project-overview-tag">Goals: {project.goals.join(' · ')}</span>
                        )}
                        {project.features?.length > 0 && (
                          <span className="project-overview-tag">Features: {project.features.join(' · ')}</span>
                        )}
                      </span>
                    </div>
                  )}
                  <p className="project-overview-description">{project.description}</p>
                </div>
                {(project.brandingDetails || project.specialRequirements || project.additionalComments || (project.technologies?.length > 0)) && (
                  <div className="project-more-details">
                    <div className="project-more-details-content">
                      {project.technologies?.length > 0 && (
                        <div className="project-more-detail-row">
                          <strong>Tech:</strong> {project.technologies.join(', ')}
                        </div>
                      )}
                      {project.brandingDetails && (
                        <div className="project-more-detail-row">
                          <strong>Branding:</strong> {project.hasBranding && `${project.hasBranding} — `}
                          {project.brandingDetails}
                        </div>
                      )}
                      {project.specialRequirements && (
                        <div className="project-more-detail-row">
                          <strong>Special requirements:</strong> {project.specialRequirements}
                        </div>
                      )}
                      {project.additionalComments && (
                        <div className="project-more-detail-row">
                          <strong>Comments:</strong> {project.additionalComments}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </>
          )}

          {activeTab === 'ai-preview' && showAIPreviewsSection && (
            <section className="project-section project-section-previews">
              <h2>AI Previews</h2>
              <p className="project-previews-intro">
                {previews.length} / {MAX_PREVIEWS_PER_PROJECT} previews.
                {isClientOwner && ' Generate up to 5 AI previews for this project. Programmers can view and use the code once assigned.'}
                {isAssignedProgrammer && !isClientOwner && " View and download the client's generated preview code to start development."}
              </p>

              {isClientOwner && canGeneratePreviews && !showGenerateForm && (
                <button
                  type="button"
                  className="btn btn-primary project-generate-preview-btn"
                  onClick={() => setShowGenerateForm(true)}
                >
                  Generate new Website
                </button>
              )}

              {showGenerateForm && (
                <form onSubmit={handleGenerateSubmit} className="project-preview-form">
                  <div className="project-preview-form-group">
                    <label htmlFor="preview-prompt">Project description *</label>
                    <textarea
                      id="preview-prompt"
                      value={generateFormData.prompt}
                      onChange={(e) => setGenerateFormData({ ...generateFormData, prompt: e.target.value })}
                      placeholder="Describe the preview you want..."
                      rows={3}
                      required
                    />
                  </div>
                  <div className="project-preview-form-row">
                    <div className="project-preview-form-group">
                      <label htmlFor="preview-budget">Budget</label>
                      <select
                        id="preview-budget"
                        value={generateFormData.budget}
                        onChange={(e) => setGenerateFormData({ ...generateFormData, budget: e.target.value })}
                      >
                        <option value="">Select...</option>
                        <option value="Under $5,000">Under $5,000</option>
                        <option value="$5,000 - $10,000">$5,000 - $10,000</option>
                        <option value="$10,000 - $25,000">$10,000 - $25,000</option>
                        <option value="$25,000+">$25,000+</option>
                      </select>
                    </div>
                    <div className="project-preview-form-group">
                      <label htmlFor="preview-timeline">Timeline</label>
                      <select
                        id="preview-timeline"
                        value={generateFormData.timeline}
                        onChange={(e) => setGenerateFormData({ ...generateFormData, timeline: e.target.value })}
                      >
                        <option value="">Select...</option>
                        <option value="1-2 weeks">1-2 weeks</option>
                        <option value="2-4 weeks">2-4 weeks</option>
                        <option value="1-2 months">1-2 months</option>
                        <option value="2-3 months">2-3 months</option>
                      </select>
                    </div>
                  </div>
                  <div className="project-preview-form-group">
                    <label htmlFor="preview-modelId">AI Model</label>
                    <select
                      id="preview-modelId"
                      value={generateFormData.modelId}
                      onChange={(e) => setGenerateFormData({ ...generateFormData, modelId: e.target.value })}
                    >
                      <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast & Economical) - Recommended</option>
                      <option value="gemini-2.5-pro">Gemini 2.5 Pro (Premium Quality)</option>
                    </select>
                    <p className="project-preview-form-hint">Flash: Faster, lower cost. Pro: Higher quality, higher cost.</p>
                  </div>
                  <div className="project-preview-form-group">
                    <label>Tech Stack</label>
                    <p className="project-preview-form-hint">Select stacks for AI analysis</p>
                    <div className="tech-stack-categories">
                      {Object.entries(TECH_STACK_BY_CATEGORY).map(([category, options]) => (
                        <div key={category} className="tech-stack-category" role="group" aria-label={`${category} technologies`}>
                          <span className="tech-stack-category-label">{category.charAt(0).toUpperCase() + category.slice(1)}</span>
                          <div className="tech-stack-options">
                            {options.map((opt) => (
                              <label key={opt.value} className="tech-stack-option">
                                <input
                                  type="checkbox"
                                  value={opt.value}
                                  checked={generateFormData.techStack.includes(opt.value)}
                                  onChange={() => {
                                    setGenerateFormData((prev) => ({
                                      ...prev,
                                      techStack: prev.techStack.includes(opt.value)
                                        ? prev.techStack.filter((t) => t !== opt.value)
                                        : [...prev.techStack, opt.value],
                                    }))
                                  }}
                                />
                                <span>{opt.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {generateError && <div className="error-message">{generateError}</div>}
                  <div className="project-preview-form-actions">
                    <button type="submit" className="btn btn-primary" disabled={generating}>
                      {generating ? 'Generating...' : 'Generate preview'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => { setShowGenerateForm(false); setGenerateError(''); }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {previewsLoading ? (
                <p className="project-previews-loading">Loading previews...</p>
              ) : previews.length === 0 ? (
                <p className="project-previews-empty">No AI previews yet. {isClientOwner && 'Generate one above.'}</p>
              ) : (
                <div className="project-previews-list">
                  {previews.map((preview) => {
                    const previewId = preview._id || preview.id
                    const isExpanded = expandedPreviewId === previewId
                    const code = preview.metadata?.websitePreviewCode || ''
                    return (
                      <div key={previewId} className="project-preview-card">
                        <div
                          className="project-preview-card-header"
                          onClick={() => setExpandedPreviewId(isExpanded ? null : previewId)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && setExpandedPreviewId(isExpanded ? null : previewId)}
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
                            <div className="project-preview-tabs">
                              <h4>Analysis</h4>
                              {renderPreviewAnalysis(preview)}
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
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => handleCopyPreviewCode(previewId, code)}
                                    >
                                      {copySuccessId === previewId ? 'Copied!' : 'Copy code'}
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => handleDownloadPreviewCode(code)}
                                    >
                                      Download ZIP
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                            {isClientOwner && (
                              <button
                                type="button"
                                className="btn btn-danger btn-sm project-preview-delete"
                                onClick={() => handleDeletePreview(previewId)}
                              >
                                Delete preview
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {activeTab === 'programmers' && (
            <div className="project-tab-panel">
              <h3 className="project-tab-panel-title">Assigned Programmer</h3>
              {project.assignedProgrammerId ? (
                <div className="programmer-card">
                  <div className="programmer-info">
                    <div className="programmer-header">
                      <h4 className="programmer-name">{project.assignedProgrammerId.name || 'Unknown Programmer'}</h4>
                      <span className="programmer-status-badge status-assigned">Assigned</span>
                    </div>
                    {project.assignedProgrammerId.email && (
                      <div className="programmer-detail">
                        <strong>Email:</strong>
                        <a href={`mailto:${project.assignedProgrammerId.email}`} className="programmer-email">
                          {project.assignedProgrammerId.email}
                        </a>
                      </div>
                    )}
                    {project.assignedProgrammerId.skills && project.assignedProgrammerId.skills.length > 0 && (
                      <div className="programmer-detail">
                        <strong>Skills:</strong>
                        <div className="programmer-skills">
                          {project.assignedProgrammerId.skills.map((skill, index) => (
                            <span key={index} className="programmer-skill-tag">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {project.assignedProgrammerId.bio && (
                      <div className="programmer-detail">
                        <strong>Bio:</strong>
                        <p className="programmer-bio">{project.assignedProgrammerId.bio}</p>
                      </div>
                    )}
                    {project.assignedProgrammerId.hourlyRate && (
                      <div className="programmer-detail">
                        <strong>Hourly Rate:</strong>
                        <span className="programmer-rate">${project.assignedProgrammerId.hourlyRate}/hr</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="programmer-empty">
                  <p>No programmer has been assigned to this project yet.</p>
                  {project.status === 'Ready' && (
                    <p className="programmer-empty-hint">
                      This project is ready for assignment. Programmers can accept it from the Assignments page.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="project-tab-panel">
              <Timeline project={project} onPhaseUpdate={handlePhaseUpdate} />
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="project-tab-panel">
              <p>Comments section coming soon...</p>
            </div>
          )}
        </div>

        <div className="project-sidebar">
          <section className="project-sidebar-tabs">
            <h3>Navigation</h3>
            <nav className="project-tab-nav">
              <button
                className={`project-tab-link ${activeTab === 'description' ? 'active' : ''}`}
                onClick={() => setActiveTab('description')}
              >
                Description
              </button>
              {showAIPreviewsSection && (
                <button
                  className={`project-tab-link ${activeTab === 'ai-preview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('ai-preview')}
                >
                  AI Preview
                </button>
              )}
              <button
                className={`project-tab-link ${activeTab === 'programmers' ? 'active' : ''}`}
                onClick={() => setActiveTab('programmers')}
              >
                Programmers
              </button>
              <button
                className={`project-tab-link ${activeTab === 'timeline' ? 'active' : ''}`}
                onClick={() => setActiveTab('timeline')}
              >
                Timeline
              </button>
              <button
                className={`project-tab-link ${activeTab === 'comments' ? 'active' : ''}`}
                onClick={() => setActiveTab('comments')}
              >
                Comments
              </button>
            </nav>
          </section>
        </div>
      </div>
      </div>

    </>
  )
}

export default ProjectDetail

