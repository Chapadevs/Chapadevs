import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { projectAPI } from '../../../services/api'
import { TECH_STACK_BY_CATEGORY } from '../../../config/techStack'
import Header from '../../../components/layout-components/Header/Header'
import './CreateProject.css'

const formatBudgetDisplay = (value) => {
  const digitsOnly = value.replace(/[^\d.]/g, '')
  if (digitsOnly === '' || digitsOnly === '.') return ''
  const parts = digitsOnly.split('.')
  const intPart = parts[0] || '0'
  const decPart = parts[1] != null ? parts[1].slice(0, 2) : ''
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  if (decPart === '') return `$${formattedInt}`
  return `$${formattedInt}.${decPart}`
}

const parseBudgetForSubmit = (displayValue) => {
  if (!displayValue) return ''
  const raw = displayValue.replace(/[$,]/g, '')
  return raw === '' ? '' : raw
}

const CreateProject = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const dueDateInputRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectType: '',
    budget: '',
    timeline: '',
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
    if (name === 'budget') {
      setFormData((prev) => ({
        ...prev,
        budget: formatBudgetDisplay(value),
      }))
      return
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const timelineWeeks = Math.max(1, Math.min(52, parseInt(formData.timeline, 10) || 4))

  const handleTimelineChange = (delta) => {
    const next = Math.max(1, Math.min(52, timelineWeeks + delta))
    setFormData((prev) => ({ ...prev, timeline: String(next) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Process arrays from comma-separated strings
      const projectData = {
        ...formData,
        budget: parseBudgetForSubmit(formData.budget),
        timeline: formData.timeline || String(Math.max(1, Math.min(52, parseInt(formData.timeline, 10) || 4))),
        goals: formData.goals ? formData.goals.split(',').map((g) => g.trim()).filter(Boolean) : [],
        features: formData.features ? formData.features.split(',').map((f) => f.trim()).filter(Boolean) : [],
        designStyles: formData.designStyles ? formData.designStyles.split(',').map((s) => s.trim()).filter(Boolean) : [],
        technologies: Array.isArray(formData.technologies) ? formData.technologies : [],
        dueDate: formData.dueDate || null,
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

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="create-project-form">
        <div className="form-section">
          <h3>Basic Information</h3>
          
          <div className="form-group">
            <label htmlFor="title">Project Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Enter project title"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <input
              type="text"
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              placeholder="Describe your project in detail"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="projectType">Project Type</label>
              <select
                id="projectType"
                name="projectType"
                value={formData.projectType}
                onChange={handleChange}
              >
                <option value="">Select type</option>
                <option value="New Website Design & Development">New Website Design & Development</option>
                <option value="Website Redesign/Refresh">Website Redesign/Refresh</option>
                <option value="E-commerce Store">E-commerce Store</option>
                <option value="Landing Page">Landing Page</option>
                <option value="Web Application">Web Application</option>
                <option value="Maintenance/Updates to Existing Site">Maintenance/Updates to Existing Site</option>
                <option value="Other">Other</option>
              </select>
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
                  value={formData.dueDate}
                  onChange={handleChange}
                  className="date-input-field"
                />
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="budget">Budget</label>
              <input
                type="text"
                id="budget"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                placeholder="e.g., $5,000 - $10,000"
              />
            </div>

            <div className="form-group form-group--timeline">
              <label htmlFor="timeline">Timeline</label>
              <div className="timeline-stepper" role="group" aria-label="Project timeline in weeks">
                <button
                  type="button"
                  className="timeline-stepper-btn"
                  onClick={() => handleTimelineChange(-1)}
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
                  onClick={() => handleTimelineChange(1)}
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
          <h3>Project Details</h3>

          <div className="form-group">
            <label htmlFor="goals">Goals (comma-separated)</label>
            <input
              type="text"
              id="goals"
              name="goals"
              value={formData.goals}
              onChange={handleChange}
              placeholder="e.g., Increase sales, Improve user experience"
            />
          </div>

          <div className="form-group">
            <label htmlFor="features">Features (comma-separated)</label>
            <input
              type="text"
              id="features"
              name="features"
              value={formData.features}
              onChange={handleChange}
              placeholder="e.g., User authentication, Payment gateway, Admin dashboard"
            />
          </div>

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
                    <select
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
                    </select>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="designStyles">Design Styles (comma-separated)</label>
              <input
                type="text"
                id="designStyles"
                name="designStyles"
                value={formData.designStyles}
                onChange={handleChange}
                placeholder="e.g., Modern, Minimalist, Corporate"
              />
            </div>

            <div className="form-group">
              <label htmlFor="contentStatus">Content Status</label>
              <input
                type="text"
                id="contentStatus"
                name="contentStatus"
                value={formData.contentStatus}
                onChange={handleChange}
                placeholder="e.g., Ready, Need creation, Partial"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="specialRequirements">Special Requirements</label>
              <textarea
                id="specialRequirements"
                name="specialRequirements"
                value={formData.specialRequirements}
                onChange={handleChange}
                rows="3"
                placeholder="Any special requirements or constraints"
              />
            </div>

            <div className="form-group">
              <label htmlFor="referenceWebsites">Reference Websites</label>
              <textarea
                id="referenceWebsites"
                name="referenceWebsites"
                value={formData.referenceWebsites}
                onChange={handleChange}
                rows="3"
                placeholder="List websites you like or want to reference"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="hasBranding">Do you have branding materials?</label>
            <select
              id="hasBranding"
              name="hasBranding"
              value={formData.hasBranding}
              onChange={handleChange}
            >
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="Partial">Partial</option>
            </select>
          </div>

          {formData.hasBranding && (
            <div className="form-group">
              <label htmlFor="brandingDetails">Branding Details</label>
              <textarea
                id="brandingDetails"
                name="brandingDetails"
                value={formData.brandingDetails}
                onChange={handleChange}
                rows="3"
                placeholder="Describe your branding materials"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="additionalComments">Additional Comments</label>
            <textarea
              id="additionalComments"
              name="additionalComments"
              value={formData.additionalComments}
              onChange={handleChange}
              rows="4"
              placeholder="Any additional information or comments"
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Project'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
      </div>
    </>
  )
}

export default CreateProject
