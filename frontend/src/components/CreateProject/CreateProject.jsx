import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { projectAPI } from '../../services/api'
import Header from '../Header/Header'
import './CreateProject.css'

const CreateProject = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
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
    technologies: '',
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Process arrays from comma-separated strings
      const projectData = {
        ...formData,
        goals: formData.goals ? formData.goals.split(',').map((g) => g.trim()).filter(Boolean) : [],
        features: formData.features ? formData.features.split(',').map((f) => f.trim()).filter(Boolean) : [],
        designStyles: formData.designStyles ? formData.designStyles.split(',').map((s) => s.trim()).filter(Boolean) : [],
        technologies: formData.technologies ? formData.technologies.split(',').map((t) => t.trim()).filter(Boolean) : [],
        dueDate: formData.dueDate || null,
      }

      const project = await projectAPI.create(projectData)
      navigate(`/projects/${project.id}`)
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
        <h2>Create New Project</h2>
        <button onClick={() => navigate('/projects')} className="btn btn-secondary">
          Cancel
        </button>
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
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="5"
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
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
              />
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

            <div className="form-group">
              <label htmlFor="timeline">Timeline</label>
              <input
                type="text"
                id="timeline"
                name="timeline"
                value={formData.timeline}
                onChange={handleChange}
                placeholder="e.g., 4-6 weeks"
              />
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
            <label htmlFor="technologies">Technologies (comma-separated)</label>
            <input
              type="text"
              id="technologies"
              name="technologies"
              value={formData.technologies}
              onChange={handleChange}
              placeholder="e.g., React, Node.js, MongoDB"
            />
          </div>

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

