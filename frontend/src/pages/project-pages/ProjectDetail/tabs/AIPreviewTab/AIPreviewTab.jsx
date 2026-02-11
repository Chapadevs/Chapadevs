import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { generateAIPreview, deleteAIPreview } from '../../../../../services/api'
import { TECH_STACK_BY_CATEGORY } from '../../../../../utils/techStack'
import { downloadPreviewCode } from '../../utils/downloadUtils'
import AIPreviewForm from './components/AIPreviewForm/AIPreviewForm'
import AIPreviewCard from './components/AIPreviewCard/AIPreviewCard'
import './AIPreviewTab.css'

const MAX_PREVIEWS_PER_PROJECT = 5

// Helper function to map project budget to form budget format
const mapBudgetToForm = (projectBudget) => {
  if (!projectBudget) return ''
  const budgetStr = String(projectBudget).replace(/[$,]/g, '')
  const budgetNum = parseFloat(budgetStr)
  if (isNaN(budgetNum)) return ''
  if (budgetNum < 5000) return 'Under $5,000'
  if (budgetNum < 10000) return '$5,000 - $10,000'
  if (budgetNum < 25000) return '$10,000 - $25,000'
  return '$25,000+'
}

// Helper function to map project timeline to form timeline format
const mapTimelineToForm = (projectTimeline) => {
  if (!projectTimeline) return ''
  const weeks = parseInt(projectTimeline, 10)
  if (isNaN(weeks)) return ''
  if (weeks <= 2) return '1-2 weeks'
  if (weeks <= 4) return '2-4 weeks'
  if (weeks <= 8) return '1-2 months'
  return '2-3 months'
}

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
  
  // Initialize form data with project data when form is shown
  const initialFormData = useMemo(() => ({
    prompt: project?.description || '',
    budget: project?.budget ? mapBudgetToForm(project.budget) : '',
    timeline: project?.timeline ? mapTimelineToForm(project.timeline) : '',
    projectType: project?.projectType || '',
    techStack: Array.isArray(project?.technologies) ? project.technologies : [],
    modelId: 'gemini-2.0-flash',
  }), [project])
  
  const [generateFormData, setGenerateFormData] = useState(initialFormData)
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
      setGenerateFormData(initialFormData)
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
      <h3 className="project-tab-panel-title">AI Previews</h3>
      <p className="project-previews-intro">
        {previews.length} / {MAX_PREVIEWS_PER_PROJECT} previews.
        {isClientOwner && ' Generate up to 5 AI previews for this project. Programmers can view and use the code once assigned.'}
        {isAssignedProgrammer && !isClientOwner && " View and download the client's generated preview code to start development."}
      </p>

      {isClientOwner && canGeneratePreviews && !showGenerateForm && (
        <button
          type="button"
          className="btn btn-primary project-generate-preview-btn"
          onClick={() => {
            setGenerateFormData(initialFormData)
            setShowGenerateForm(true)
          }}
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
          onCancel={() => { 
            setShowGenerateForm(false)
            setGenerateError('')
            setGenerateFormData(initialFormData)
          }}
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
