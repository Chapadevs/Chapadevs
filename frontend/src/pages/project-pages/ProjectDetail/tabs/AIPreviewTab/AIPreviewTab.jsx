import { useState, useMemo, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { generateAIPreviewStream, deleteAIPreview } from '../../../../../services/api'
import { TECH_STACK_BY_CATEGORY } from '../../../../../utils/techStack'
import { downloadPreviewCode } from '../../utils/downloadUtils'
import AIPreviewForm from './components/AIPreviewForm/AIPreviewForm'
import AIPreviewCard from './components/AIPreviewCard/AIPreviewCard'
import AIPreviewCardSkeleton from './components/AIPreviewCardSkeleton/AIPreviewCardSkeleton'
import './AIPreviewTab.css'

const MAX_PREVIEWS_PER_PROJECT = 3

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
const mapWorkspaceToForm = (projectWorkspace) => {
  if (!projectWorkspace) return ''
  const weeks = parseInt(projectWorkspace, 10)
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
  
  // Initialize form data with project data when form is shown
  const initialFormData = useMemo(() => ({
    prompt: project?.description || '',
    budget: project?.budget ? mapBudgetToForm(project.budget) : '',
    timeline: project?.timeline ? mapWorkspaceToForm(project.timeline) : '',
    projectType: project?.projectType || '',
    techStack: Array.isArray(project?.technologies) ? project.technologies : [],
    modelId: 'gemini-2.5-pro',
  }), [project])
  
  const [generateFormData, setGenerateFormData] = useState(initialFormData)
  const [generating, setGenerating] = useState(false)
  const [streamedThinking, setStreamedThinking] = useState('')
  const [generateError, setGenerateError] = useState('')
  const [copySuccessId, setCopySuccessId] = useState(null)

  const handleGenerateSubmit = async (e) => {
    e.preventDefault()
    if (!generateFormData.prompt.trim()) {
      setGenerateError('Please describe your project')
      return
    }
    setGenerating(true)
    setGenerateError('')
    setStreamedThinking('')
    const payload = {
      ...generateFormData,
      projectId: id,
      techStack: Array.isArray(generateFormData.techStack)
        ? generateFormData.techStack.join(', ')
        : String(generateFormData.techStack || ''),
    }
    generateAIPreviewStream(payload, {
      onChunk: (text) => setStreamedThinking((prev) => prev + text),
      onDone: async () => {
        setGenerating(false)
        setStreamedThinking('')
        setGenerateFormData(initialFormData)
        await loadPreviews()
      },
      onError: (message) => {
        setGenerating(false)
        setStreamedThinking('')
        setGenerateError(message || 'Failed to generate preview')
      },
    })
  }

  const handleDeletePreview = useCallback(async (previewId) => {
    if (!window.confirm('Delete this AI preview?')) return
    try {
      await deleteAIPreview(previewId)
      await loadPreviews()
    } catch (err) {
      setError(err.message || 'Failed to delete preview')
    }
  }, [loadPreviews, setError])

  const handleCopyPreviewCode = useCallback(async (previewId, code) => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopySuccessId(previewId)
      setTimeout(() => setCopySuccessId(null), 2000)
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }, [])

  const handleDownloadPreviewCode = useCallback(async (code) => {
    await downloadPreviewCode(code)
  }, [])

  return (
    <section className="project-section project-section-previews">
        <AIPreviewForm
          generateFormData={generateFormData}
          setGenerateFormData={setGenerateFormData}
          generating={generating}
          streamedThinking={streamedThinking}
          generateError={generateError}
          techStackByCategory={TECH_STACK_BY_CATEGORY}
          onSubmit={handleGenerateSubmit}
          onCancel={() => { 
            setGenerateError('')
            setGenerateFormData(initialFormData)
          }}
        />

    <div className="text-center mb-4">
        <h3 className="project-tab-panel-title font-heading text-sm uppercase tracking-wider border-0">AI PREVIEW</h3>
        <p className="project-previews-intro font-body text-sm text-ink-secondary">
          {isClientOwner && (previews.length ? 'Your generated previews. Programmers can view and use the code once assigned.' : 'Generate up to 3 AI previews above.')}
          {isAssignedProgrammer && !isClientOwner && (previews.length ? "View and download the client's generated preview code to start development." : 'No preview yet.')}
        </p>
      </div>

      {previewsLoading ? (
        <p className="project-previews-loading font-body text-sm text-ink-secondary">Loading previews...</p>
      ) : previews.length === 0 && !isClientOwner ? (
        <p className="project-previews-empty font-body text-sm text-ink-secondary">No AI preview yet.</p>
      ) : (
        <div className="flex flex-nowrap gap-4 max-w-5xl items-start justify-center">
          {Array.from({ length: MAX_PREVIEWS_PER_PROJECT }, (_, i) => {
            const preview = previews[i]
            if (preview) {
              return (
                <AIPreviewCard
                  key={preview._id || preview.id}
                  preview={preview}
                  copySuccessId={copySuccessId}
                  isClientOwner={isClientOwner}
                  onCopyCode={handleCopyPreviewCode}
                  onDownloadCode={handleDownloadPreviewCode}
                  onDeletePreview={handleDeletePreview}
                />
              )
            }
            if (isClientOwner && previews.length < MAX_PREVIEWS_PER_PROJECT) {
              return <AIPreviewCardSkeleton key={`skeleton-${i}`} />
            }
            return null
          })}
        </div>
      )}
    </section>
  )
}

export default AIPreviewTab
