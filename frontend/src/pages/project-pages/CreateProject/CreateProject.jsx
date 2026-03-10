import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { projectAPI } from '../../../services/api'
import { TECH_STACK_BY_CATEGORY } from '../../../utils/techStack'
import { getDueDateFromStartAndWeeks } from '../../../utils/dateUtils'
import Header from '../../../components/layout-components/Header/Header'
import { Button, SectionTitle, Alert, Input, Select, Textarea } from '../../../components/ui-components'
import './CreateProject.css'

const toISODateOnly = (d) => {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

const mapProjectDataToForm = (projectData) => {
  const toStr = (v) => (Array.isArray(v) ? v.join(', ') : (v ?? ''))
  return {
    title: projectData.title ?? '',
    description: projectData.description ?? '',
    projectType: projectData.projectType ?? '',
    timeline: projectData.timeline ?? '',
    startDate: toISODateOnly(projectData.startDate) || toISODateOnly(new Date()),
    goals: toStr(projectData.goals),
    features: toStr(projectData.features),
    designStyles: toStr(projectData.designStyles),
    technologies: Array.isArray(projectData.technologies) ? projectData.technologies : [],
    hasBranding: projectData.hasBranding ?? '',
    brandingDetails: projectData.brandingDetails ?? '',
    contentStatus: projectData.contentStatus ?? '',
    referenceWebsites: projectData.referenceWebsites ?? '',
    specialRequirements: projectData.specialRequirements ?? '',
    additionalComments: projectData.additionalComments ?? '',
    dueDate: '',
  }
}

const CreateProject = () => {
  const navigate = useNavigate()
  const dueDateInputRef = useRef(null)
  const startDateInputRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [error, setError] = useState(null)
  const defaultStart = toISODateOnly(new Date())
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectType: '',
    timeline: '',
    startDate: defaultStart,
    goals: '',
    features: '',
    designStyles: '',
    technologies: [],
    hasBranding: '',
    brandingDetails: '',
    contentStatus: '',
    referenceWebsites: '',
    specialRequirements: '',
    additionalComments: '',
    dueDate: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const timelineWeeks = Math.max(1, Math.min(52, parseInt(formData.timeline, 10) || 4))
  const derivedDueDate = formData.dueDate || toISODateOnly(getDueDateFromStartAndWeeks(formData.startDate, formData.timeline || String(timelineWeeks)))

  const handleWorkspaceChange = (delta) => {
    const next = Math.max(1, Math.min(52, timelineWeeks + delta))
    setFormData((prev) => ({ ...prev, timeline: String(next) }))
  }

  const handleGenerateWithAI = async (e) => {
    e.preventDefault()
    if (!aiPrompt.trim()) {
      setError('Please describe your project to generate requirements')
      return
    }
    setError(null)
    setGenerating(true)
    try {
      const { projectData } = await projectAPI.generateProjectRequirements(aiPrompt.trim())
      setFormData(mapProjectDataToForm(projectData))
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to generate project requirements')
    } finally {
      setGenerating(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const weeks = formData.timeline || String(Math.max(1, Math.min(52, parseInt(formData.timeline, 10) || 4)))
      const startDate = formData.startDate || toISODateOnly(new Date())
      let dueDate = formData.dueDate || null
      if (!dueDate && startDate && weeks) {
        const computed = getDueDateFromStartAndWeeks(startDate, weeks)
        dueDate = computed ? toISODateOnly(computed) : null
      }

      const projectData = {
        ...formData,
        timeline: weeks,
        startDate: startDate || null,
        dueDate: dueDate || null,
        goals: formData.goals ? formData.goals.split(',').map((g) => g.trim()).filter(Boolean) : [],
        features: formData.features ? formData.features.split(',').map((f) => f.trim()).filter(Boolean) : [],
        designStyles: formData.designStyles ? formData.designStyles.split(',').map((s) => s.trim()).filter(Boolean) : [],
        technologies: Array.isArray(formData.technologies) ? formData.technologies : [],
      }

      const project = await projectAPI.create(projectData)
      const projectId = project.id || project._id
      navigate(`/projects/${projectId}`)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />
      <div className="create-project-container">
      <div className="create-project-header">
        <h2>New Project</h2>
      </div>

      {error && <Alert variant="error" className="error-message">{error}</Alert>}

      <div className="form-section create-project-ai-block">
        <SectionTitle className="mb-4">Generate with AI</SectionTitle>
        <p className="form-hint mb-3">Describe your project in your own words and we&apos;ll fill the form for you.</p>
        <div className="create-project-ai-input-row">
          <Textarea
            id="ai-prompt"
            label="Project description"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            rows={3}
            placeholder="e.g., E-commerce store for handmade ceramics with inventory, user accounts, and Stripe payments"
            wrapperClassName="form-group flex-1"
            disabled={generating}
          />
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={handleGenerateWithAI}
            disabled={generating || !aiPrompt.trim()}
          >
            {generating ? 'Generating...' : 'Generate with AI'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="create-project-form">
        <div className="form-section">
          <SectionTitle className="mb-4">Basic Information</SectionTitle>
          
          <Input type="text" id="title" label="Project Title" required name="title" value={formData.title} onChange={handleChange} placeholder="Enter project title" wrapperClassName="form-group" />

          <Input type="text" id="description" label="Description" required name="description" value={formData.description} onChange={handleChange} placeholder="Describe your project in detail" wrapperClassName="form-group" />

          <div className="form-row">
            <Select id="projectType" label="Project Type" name="projectType" value={formData.projectType} onChange={handleChange} wrapperClassName="form-group">
                <option value="">Select type</option>
                <option value="New Website Design & Development">New Website Design & Development</option>
                <option value="Website Redesign/Refresh">Website Redesign/Refresh</option>
                <option value="E-commerce Store">E-commerce Store</option>
                <option value="Management Panel / ERP / CRM">Management Panel / ERP / CRM</option>
                <option value="Landing Page">Landing Page</option>
                <option value="Web Application">Web Application</option>
                <option value="Maintenance/Updates to Existing Site">Maintenance/Updates to Existing Site</option>
                <option value="Other">Other</option>
              </Select>

            <div className="form-group">
              <label htmlFor="startDate">Start Date</label>
              <div className="date-input-wrapper">
                <button
                  type="button"
                  className="date-input-calendar-btn"
                  onClick={() => startDateInputRef.current?.showPicker?.() ?? startDateInputRef.current?.focus()}
                  aria-label="Open calendar to pick start date"
                  title="Pick date"
                >
                  <svg className="date-input-calendar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </button>
                <input
                  ref={startDateInputRef}
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="date-input-field"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="dueDate">Due Date</label>
              <div className="date-input-wrapper">
                <button
                  type="button"
                  className="date-input-calendar-btn"
                  onClick={() => dueDateInputRef.current?.showPicker?.() ?? dueDateInputRef.current?.focus()}
                  aria-label="Open calendar to pick due date"
                  title="Pick date"
                >
                  <svg className="date-input-calendar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </button>
                <input
                  ref={dueDateInputRef}
                  type="date"
                  id="dueDate"
                  name="dueDate"
                  value={derivedDueDate}
                  onChange={handleChange}
                  className="date-input-field"
                />
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group form-group--timeline">
              <label htmlFor="timeline">Workspace</label>
              <div className="timeline-stepper" role="group" aria-label="Project timeline in weeks">
                <button
                  type="button"
                  className="timeline-stepper-btn"
                  onClick={() => handleWorkspaceChange(-1)}
                  aria-label="Decrease weeks"
                  disabled={timelineWeeks <= 1}
                >
                  <span aria-hidden>−</span>
                </button>
                <span className="timeline-stepper-value" id="timeline">
                  {timelineWeeks} Weeks
                </span>
                <button
                  type="button"
                  className="timeline-stepper-btn"
                  onClick={() => handleWorkspaceChange(1)}
                  aria-label="Increase weeks"
                  disabled={timelineWeeks >= 52}
                >
                  <span aria-hidden>+</span>
                </button>
                <input type="hidden" name="timeline" value={formData.timeline || String(timelineWeeks)} />
              </div>
            </div>
          </div>
        </div>

        <div className="form-section">
          <SectionTitle className="mb-4">Project Details</SectionTitle>

          <Input type="text" id="goals" label="Goals (comma-separated)" name="goals" value={formData.goals} onChange={handleChange} placeholder="e.g., Increase sales, Improve user experience" wrapperClassName="form-group" />

          <Input type="text" id="features" label="Features (comma-separated)" name="features" value={formData.features} onChange={handleChange} placeholder="e.g., User authentication, Payment gateway, Admin dashboard" wrapperClassName="form-group" />

          <div className="form-group">
            <label>Technologies</label>
            <p className="form-hint">Select the stacks your team will use</p>
            <div className="tech-stack-categories">
              {Object.entries(TECH_STACK_BY_CATEGORY).map(([category, options]) => {
                const currentSelection = formData.technologies.find((tech) =>
                  options.some((opt) => opt.value === tech)
                ) || ''
                
                return (
                  <div key={category} className="tech-stack-category">
                    <label htmlFor={`tech-${category}`} className="tech-stack-category-label">
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </label>
                    <Select
                      id={`tech-${category}`}
                      name={`tech-${category}`}
                      className="tech-stack-select"
                      value={currentSelection}
                      onChange={(e) => {
                        const selectedValue = e.target.value
                        const otherCategoryTechs = formData.technologies.filter((tech) =>
                          !options.some((opt) => opt.value === tech)
                        )
                        setFormData((prev) => ({
                          ...prev,
                          technologies: selectedValue
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

          <div className="form-row">
            <Input type="text" id="designStyles" label="Design Styles (comma-separated)" name="designStyles" value={formData.designStyles} onChange={handleChange} placeholder="e.g., Modern, Minimalist, Corporate" wrapperClassName="form-group" />

            <Input type="text" id="contentStatus" label="Content Status" name="contentStatus" value={formData.contentStatus} onChange={handleChange} placeholder="e.g., Ready, Need creation, Partial" wrapperClassName="form-group" />
          </div>

          <div className="form-row">
            <Textarea id="specialRequirements" label="Special Requirements" name="specialRequirements" value={formData.specialRequirements} onChange={handleChange} rows={3} placeholder="Any special requirements or constraints" wrapperClassName="form-group" />

            <Textarea id="referenceWebsites" label="Reference Websites" name="referenceWebsites" value={formData.referenceWebsites} onChange={handleChange} rows={3} placeholder="List websites you like or want to reference" wrapperClassName="form-group" />
          </div>

          <Select id="hasBranding" label="Do you have branding materials?" name="hasBranding" value={formData.hasBranding} onChange={handleChange} wrapperClassName="form-group">
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="Partial">Partial</option>
            </Select>

          {formData.hasBranding && (
            <Textarea id="brandingDetails" label="Branding Details" name="brandingDetails" value={formData.brandingDetails} onChange={handleChange} rows={3} placeholder="Describe your branding materials" wrapperClassName="form-group" />
          )}

          <Textarea id="additionalComments" label="Additional Comments" name="additionalComments" value={formData.additionalComments} onChange={handleChange} rows={4} placeholder="Any additional information or comments" wrapperClassName="form-group" />
        </div>

        <div className="form-actions">
          <Button type="submit" variant="primary" size="lg" disabled={loading}>
            {loading ? 'Creating...' : 'Create Project'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => navigate('/projects')}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
      </div>
    </>
  )
}

export default CreateProject
