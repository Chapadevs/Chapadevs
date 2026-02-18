import { useRef, useEffect, useMemo } from 'react'
import { SecondaryButton, Button, Alert, Select, Textarea } from '../../../../../../../components/ui-components'
import './AIPreviewForm.css'

/** Make streamed JSON/code readable: literal \n → newline, \t → tab, \" → ", \\ → \ */
function unescapeStreamDisplay(str) {
  if (typeof str !== 'string' || !str) return ''
  let out = str
    .replace(/\\\\/g, '\u0000')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\u0000/g, '\\')
  // Strip markdown fences so we don't show raw ```json / ```
  out = out.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/g, '')
  return out.trim() || '…'
}

/** Infer current phase from streamed content for human-readable status */
function getStreamPhase(raw) {
  if (!raw || raw.length < 10) return 'Starting…'
  const s = raw
  if (s.includes('export default App') || s.includes('export default App;')) return 'Finalizing…'
  if (s.includes('"code"') || s.includes('function App') || s.includes('import { useState }')) return 'Writing component…'
  if (s.includes('<section') || s.includes('className=')) return 'Building layout…'
  if (s.includes('features') || s.includes('techStack')) return 'Planning features & tech stack…'
  if (s.includes('analysis') && (s.includes('overview') || s.includes('title'))) return 'Analyzing project…'
  return 'Generating…'
}

const AIPreviewForm = ({
  generateFormData,
  setGenerateFormData,
  generating,
  streamedThinking = '',
  generateError,
  onSubmit,
  onCancel,
}) => {
  const thinkingEndRef = useRef(null)

  const displayText = useMemo(() => unescapeStreamDisplay(streamedThinking), [streamedThinking])
  const phase = useMemo(() => getStreamPhase(streamedThinking), [streamedThinking])

  useEffect(() => {
    if (generating && streamedThinking && thinkingEndRef.current) {
      thinkingEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [generating, streamedThinking])

  const handleChange = (field, value) => {
    setGenerateFormData({ ...generateFormData, [field]: value })
  }

  return (
    <form onSubmit={onSubmit} className="project-preview-form space-y-6">
      {generating ? (
        <div className="project-preview-form-thinking-wrap">
          <div className="project-preview-form-thinking-header font-heading text-xs uppercase tracking-wider text-ink flex items-center gap-2">
            <span className="project-preview-form-thinking-dot" aria-hidden />
            Generating — {phase}
          </div>
          <div className="project-preview-form-thinking-body font-body text-ink-secondary text-sm whitespace-pre-wrap break-words overflow-y-auto">
            {displayText || 'Starting…'}
            <span ref={thinkingEndRef} />
          </div>
        </div>
      ) : (
        <>
          <Textarea
            id="preview-prompt"
            label="Project description"
            value={generateFormData.prompt}
            onChange={(e) => handleChange('prompt', e.target.value)}
            placeholder="Describe the preview you want AI to generate..."
            required
            className=""
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-[10px] text-ink-muted/60 font-medium uppercase tracking-wider hidden sm:inline-block">
                {generateFormData.prompt?.length || 0} characters
              </span>
              <div className="project-preview-form-group flex flex-col gap-2">
                <label htmlFor="preview-modelId" className="font-heading text-[10px] text-ink-muted uppercase tracking-[0.1em] font-bold px-1">
                  AI Model
                </label>
                <Select
                  id="preview-modelId"
                  value={generateFormData.modelId}
                  onChange={(e) => handleChange('modelId', e.target.value)}
                  className="w-full"
                >
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast & Economical) - Recommended</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (Premium Quality)</option>
                </Select>
                <p className="text-[11px] text-ink-muted italic px-1">
                  Flash: Faster, lower cost. Pro: Higher quality, higher cost.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <SecondaryButton type="button" variant="ghost" size="sm" className="text-ink-muted hover:text-ink font-normal lowercase" onClick={onCancel}>
                  cancel
                </SecondaryButton>
                <Button type="submit" disabled={!generateFormData.prompt} size="sm" className="h-8 px-4 text-xs font-medium rounded-lg shadow-sm">
                  Generate
                </Button>
              </div>
            </div>
          </Textarea>
        </>
      )}

      {generateError && (
        <Alert variant="error" className="mt-4">
          {generateError}
        </Alert>
      )}
    </form>
  )
}

export default AIPreviewForm