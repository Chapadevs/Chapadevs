import { Button, Alert, Select, Textarea } from '../../../../../../../components/ui-components'
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
      <Textarea
        id="preview-prompt"
        label="Project description"
        value={generateFormData.prompt}
        onChange={(e) => setGenerateFormData({ ...generateFormData, prompt: e.target.value })}
        placeholder="Describe the preview you want..."
        rows={3}
        required
        wrapperClassName="project-preview-form-group"
      />
      <div className="project-preview-form-row">
        <Select
          id="preview-budget"
          label="Budget"
          value={generateFormData.budget}
          onChange={(e) => setGenerateFormData({ ...generateFormData, budget: e.target.value })}
          wrapperClassName="project-preview-form-group"
        >
          <option value="">Select...</option>
          <option value="Under $5,000">Under $5,000</option>
          <option value="$5,000 - $10,000">$5,000 - $10,000</option>
          <option value="$10,000 - $25,000">$10,000 - $25,000</option>
          <option value="$25,000+">$25,000+</option>
        </Select>
        <Select
          id="preview-timeline"
          label="Timeline"
          value={generateFormData.timeline}
          onChange={(e) => setGenerateFormData({ ...generateFormData, timeline: e.target.value })}
          wrapperClassName="project-preview-form-group"
        >
          <option value="">Select...</option>
          <option value="1-2 weeks">1-2 weeks</option>
          <option value="2-4 weeks">2-4 weeks</option>
          <option value="1-2 months">1-2 months</option>
          <option value="2-3 months">2-3 months</option>
        </Select>
      </div>
      <div className="project-preview-form-group">
        <label htmlFor="preview-modelId">AI Model</label>
        <Select
          id="preview-modelId"
          value={generateFormData.modelId}
          onChange={(e) => setGenerateFormData({ ...generateFormData, modelId: e.target.value })}
        >
          <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast & Economical) - Recommended</option>
          <option value="gemini-2.5-pro">Gemini 2.5 Pro (Premium Quality)</option>
        </Select>
        <p className="project-preview-form-hint">Flash: Faster, lower cost. Pro: Higher quality, higher cost.</p>
      </div>
      <div className="project-preview-form-group">
        <label>Tech Stack</label>
        <div className="tech-stack-categories">
          {Object.entries(techStackByCategory).map(([category, options]) => {
            const currentSelection = generateFormData.techStack.find((tech) =>
              options.some((opt) => opt.value === tech)
            ) || ''
            
            return (
              <div key={category} className="tech-stack-category">
                <label htmlFor={`preview-tech-${category}`} className="tech-stack-category-label">
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </label>
                <Select
                  id={`preview-tech-${category}`}
                  name={`preview-tech-${category}`}
                  className="tech-stack-select"
                  value={currentSelection}
                  onChange={(e) => {
                    const selectedValue = e.target.value
                    const otherCategoryTechs = generateFormData.techStack.filter((tech) =>
                      !options.some((opt) => opt.value === tech)
                    )
                    setGenerateFormData((prev) => ({
                      ...prev,
                      techStack: selectedValue
                        ? [...otherCategoryTechs, selectedValue]
                        : otherCategoryTechs,
                    }))
                  }}
                >
                  <option value="">Select {category}</option>
                  {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
            )
          })}
        </div>
      </div>
      {generateError && <Alert variant="error">{generateError}</Alert>}
      <div className="project-preview-form-actions">
        <Button type="submit" variant="primary" className="btn btn-primary" disabled={generating}>
          {generating ? 'Generating...' : 'Generate preview'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="btn btn-secondary"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

export default AIPreviewForm
