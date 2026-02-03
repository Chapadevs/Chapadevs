import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { generateAIPreview, deleteAIPreview } from '../../../../services/api'
import { TECH_STACK_BY_CATEGORY } from '../../../../config/techStack'
import { downloadPreviewCode } from '../../utils/downloadUtils'
import AIPreviewForm from './components/AIPreviewForm/AIPreviewForm'
import AIPreviewCard from './components/AIPreviewCard/AIPreviewCard'
import './AIPreviewTab.css'

const MAX_PREVIEWS_PER_PROJECT = 5

const AIPreviewTab = ({
  project,
  previews,
  previewsLoading,
  isClientOwner,
  isAssignedProgrammer,
  canGeneratePreviews,
  loadPreviews,
  setError,
}) => {
  const { id } = useParams()
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
    await downloadPreviewCode(code)
  }

  return (
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
        <AIPreviewForm
          generateFormData={generateFormData}
          setGenerateFormData={setGenerateFormData}
          generating={generating}
          generateError={generateError}
          techStackByCategory={TECH_STACK_BY_CATEGORY}
          onSubmit={handleGenerateSubmit}
          onCancel={() => { setShowGenerateForm(false); setGenerateError(''); }}
        />
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
            return (
              <AIPreviewCard
                key={previewId}
                preview={preview}
                isExpanded={isExpanded}
                copySuccessId={copySuccessId}
                isClientOwner={isClientOwner}
                onToggleExpand={() => setExpandedPreviewId(isExpanded ? null : previewId)}
                onCopyCode={handleCopyPreviewCode}
                onDownloadCode={handleDownloadPreviewCode}
                onDeletePreview={handleDeletePreview}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}

export default AIPreviewTab
