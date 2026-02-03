import './AIPreviewForm.css'

const AIPreviewForm = ({
  generateFormData,
  setGenerateFormData,
  generating,
  generateError,
  techStackByCategory,
  onSubmit,
  onCancel,
}) => {
  return (
    <form onSubmit={onSubmit} className="project-preview-form">
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
          {Object.entries(techStackByCategory).map(([category, options]) => (
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
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default AIPreviewForm
