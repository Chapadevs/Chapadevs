import React, { useState } from 'react'
import { submitInquiry } from '../../services/api'
import './InquiryForm.css'

const InquiryForm = () => {
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [validationMessage, setValidationMessage] = useState('')
  const [touched, setTouched] = useState({})

  const steps = [
    'Contact Info',
    'Project Details',
    'Features & Design',
    'Timeline & Budget',
    'Current Website',
    'Additional Details',
    'Review & Submit'
  ]

  const goalsList = [
    'Increase online presence',
    'Generate leads/sales',
    'Showcase portfolio/services',
    'Sell products online',
    'Improve user experience',
    'Mobile optimization',
    'SEO improvement'
  ]

  const featuresList = [
    'Contact forms',
    'Online booking/scheduling',
    'Payment processing',
    'User accounts/login',
    'Blog/news section',
    'Photo galleries',
    'Social media integration',
    'Email newsletter signup',
    'Search functionality',
    'Multi-language support',
    'Analytics tracking'
  ]

  const stylesList = [
    'Modern/minimalist',
    'Creative/artistic',
    'Professional/corporate',
    'Playful/colorful',
    'Industry-specific design',
    'Not sure - need guidance'
  ]

  const [formData, setFormData] = useState({
    from_name: '',
    from_email: '',
    company_name: '',
    phone: '',
    contact_method: '',
    project_type: '',
    project_description: '',
    goals: [],
    goals_other: '',
    features: [],
    features_other: '',
    styles: [],
    budget: '',
    timeline: '',
    has_website: '',
    website_url: '',
    current_host: '',
    branding: '',
    branding_details: '',
    content_status: '',
    reference_websites: '',
    special_requirements: '',
    hear_about_us: '',
    hear_about_us_other: '',
    additional_comments: ''
  })

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const onFieldTouch = (fieldName) => {
    setTouched({ ...touched, [fieldName]: true })
  }

  const markFieldsAsTouched = (fieldNames) => {
    const newTouched = { ...touched }
    fieldNames.forEach(field => {
      newTouched[field] = true
    })
    setTouched(newTouched)
  }

  const updateField = (fieldName, value) => {
    setFormData({ ...formData, [fieldName]: value })
  }

  const onGoalChange = (event) => {
    const goals = formData.goals || []
    if (event.target.checked) {
      updateField('goals', [...goals, event.target.value])
    } else {
      updateField('goals', goals.filter(g => g !== event.target.value))
    }
  }

  const onFeatureChange = (event) => {
    const features = formData.features || []
    if (event.target.checked) {
      updateField('features', [...features, event.target.value])
    } else {
      updateField('features', features.filter(f => f !== event.target.value))
    }
  }

  const onStyleChange = (event) => {
    const styles = formData.styles || []
    if (event.target.checked) {
      updateField('styles', [...styles, event.target.value])
    } else {
      updateField('styles', styles.filter(s => s !== event.target.value))
    }
  }

  const nextStep = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
      setValidationMessage('')
    }
  }

  const prevStep = () => {
    if (step > 0) {
      setStep(step - 1)
      setValidationMessage('')
    }
  }

  const validateStep = () => {
    switch (step) {
      case 0:
        return formData.from_name && formData.from_email && isValidEmail(formData.from_email) && formData.contact_method
      case 1:
        return formData.project_type && formData.project_description && formData.goals && formData.goals.length > 0
      case 2:
        return formData.features && formData.features.length > 0
      case 3:
        return formData.budget && formData.timeline
      case 4:
        return formData.has_website
      case 5:
        return formData.branding && formData.content_status
      default:
        return true
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateStep()) {
      setSubmitMessage('Please fill in all required fields.')
      setSubmitSuccess(false)
      return
    }

    setIsSubmitting(true)
    setSubmitMessage('')

    try {
      const customerEmail = formData.from_email?.trim()
      if (!customerEmail || !isValidEmail(customerEmail)) {
        throw new Error('Invalid email address format')
      }

      const result = await submitInquiry(formData)

      setIsSubmitting(false)
      setSubmitSuccess(true)
      setSubmitMessage(
        result.message || "Thank you! Your inquiry has been submitted successfully. We've also sent you a confirmation email. We'll get back to you within 24 hours."
      )

      setTimeout(() => {
        setFormData({
          from_name: '',
          from_email: '',
          company_name: '',
          phone: '',
          contact_method: '',
          project_type: '',
          project_description: '',
          goals: [],
          goals_other: '',
          features: [],
          features_other: '',
          styles: [],
          budget: '',
          timeline: '',
          has_website: '',
          website_url: '',
          current_host: '',
          branding: '',
          branding_details: '',
          content_status: '',
          reference_websites: '',
          special_requirements: '',
          hear_about_us: '',
          hear_about_us_other: '',
          additional_comments: ''
        })
        setStep(0)
        setSubmitMessage('')
        setTouched({})
      }, 3001)
    } catch (error) {
      console.error('Error submitting inquiry:', error)
      setIsSubmitting(false)
      setSubmitSuccess(false)
      const msg = error.response?.data?.message || error.message
      if (error instanceof Error && error.message === 'Invalid email address format') {
        setSubmitMessage('Please enter a valid email address.')
      } else if (msg) {
        setSubmitMessage(msg)
      } else {
        setSubmitMessage("Sorry, there was an error sending your inquiry. Please try again or contact us directly.")
      }
    }
  }

  const reviewFields = [
    { label: 'Name', key: 'from_name' },
    { label: 'Email', key: 'from_email' },
    { label: 'Company', key: 'company_name' },
    { label: 'Phone', key: 'phone' },
    { label: 'Preferred Contact', key: 'contact_method' },
    { label: 'Project Type', key: 'project_type' },
    { label: 'Description', key: 'project_description' },
    { label: 'Goals', key: 'goals' },
    { label: 'Required Features', key: 'features' },
    { label: 'Design Styles', key: 'styles' },
    { label: 'Budget', key: 'budget' },
    { label: 'Timeline', key: 'timeline' },
    { label: 'Has Website', key: 'has_website' },
    { label: 'Website URL', key: 'website_url' },
    { label: 'Current Host', key: 'current_host' },
    { label: 'Branding', key: 'branding' },
    { label: 'Content Status', key: 'content_status' },
    { label: 'Reference Websites', key: 'reference_websites' },
    { label: 'Special Requirements', key: 'special_requirements' },
    { label: 'How did you hear about us', key: 'hear_about_us' },
    { label: 'Additional Comments', key: 'additional_comments' }
  ]

  return (
    <section className="inquiry-section" id="inquiry-form">
      <div className="container">
        <div className="inquiry-content">
          <header className="section-header">
            <h2 className="section-title">
              <span className="title-line-1">
                <span className="dark-text">PROJECT</span>
                <span className="green-text">INQUIRY</span>
              </span>
            </h2>
            <p className="section-description">
              Let's get started! Fill out each step and review before submitting.
            </p>
          </header>
          <div className="wizard-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${(step / (steps.length - 1)) * 100}%` }}
              ></div>
            </div>
            <div className="step-indicators">
              {steps.map((s, i) => (
                <div
                  key={i}
                  className={`step-indicator ${i <= step ? 'active' : ''} ${i === step ? 'current' : ''}`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
          <form className="inquiry-form" onSubmit={onSubmit} autoComplete="off" noValidate>
            {/* Step 1: Contact Info */}
            {step === 0 && (
              <div className="form-step">
                <h3 className="step-title">Contact Information</h3>
                <div className="form-group">
                  <label htmlFor="from_name">Your Name *</label>
                  <input
                    id="from_name"
                    value={formData.from_name}
                    onChange={(e) => updateField('from_name', e.target.value)}
                    onBlur={() => onFieldTouch('from_name')}
                    required
                    className={`required-field ${touched.from_name && !formData.from_name ? 'error' : ''}`}
                  />
                  {touched.from_name && !formData.from_name && (
                    <div className="error-message">Please enter your name.</div>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="from_email">Email *</label>
                  <input
                    id="from_email"
                    type="email"
                    value={formData.from_email}
                    onChange={(e) => updateField('from_email', e.target.value)}
                    onBlur={() => onFieldTouch('from_email')}
                    required
                    className={`required-field ${touched.from_email && (!formData.from_email || !isValidEmail(formData.from_email)) ? 'error' : ''}`}
                  />
                  {touched.from_email && (!formData.from_email || !isValidEmail(formData.from_email)) && (
                    <div className="error-message">Please enter a valid email address.</div>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="company_name">Company/Organization (optional)</label>
                  <input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => updateField('company_name', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="phone">Phone Number (optional)</label>
                  <input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="contact_method">Preferred Contact Method *</label>
                  <select
                    id="contact_method"
                    value={formData.contact_method}
                    onChange={(e) => updateField('contact_method', e.target.value)}
                    onBlur={() => onFieldTouch('contact_method')}
                    required
                    className={`required-field ${touched.contact_method && !formData.contact_method ? 'error' : ''}`}
                  >
                    <option value="">Select</option>
                    <option>Email</option>
                    <option>Phone</option>
                    <option>WhatsApp</option>
                  </select>
                  {touched.contact_method && !formData.contact_method && (
                    <div className="error-message">Please select your preferred contact method.</div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Project Details */}
            {step === 1 && (
              <div className="form-step">
                <h3 className="step-title">Project Details</h3>
                <div className="form-group">
                  <label htmlFor="project_type">Project Type *</label>
                  <select
                    id="project_type"
                    value={formData.project_type}
                    onChange={(e) => updateField('project_type', e.target.value)}
                    required
                    className={`required-field ${touched.project_type && !formData.project_type ? 'error' : ''}`}
                  >
                    <option value="">Select</option>
                    <option>New Website Design & Development</option>
                    <option>Website Redesign/Refresh</option>
                    <option>E-commerce Store</option>
                    <option>Landing Page</option>
                    <option>Web Application</option>
                    <option>Maintenance/Updates to Existing Site</option>
                    <option>Other</option>
                  </select>
                  {touched.project_type && !formData.project_type && (
                    <div className="error-message">Please select a project type.</div>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="project_description">Brief Project Description *</label>
                  <textarea
                    id="project_description"
                    value={formData.project_description}
                    onChange={(e) => updateField('project_description', e.target.value)}
                    rows="3"
                    required
                    className={`required-field ${touched.project_description && !formData.project_description ? 'error' : ''}`}
                    placeholder="Describe your project in 2-3 sentences"
                  ></textarea>
                  {touched.project_description && !formData.project_description && (
                    <div className="error-message">Please provide a project description.</div>
                  )}
                </div>
                <div className="form-group">
                  <label>Primary Goals *</label>
                  <div className={`checkbox-group required-field ${touched.goals && (!formData.goals || formData.goals.length === 0) ? 'error' : ''}`}>
                    {goalsList.map((goal) => (
                      <label key={goal}>
                        <input
                          type="checkbox"
                          value={goal}
                          checked={(formData.goals || []).includes(goal)}
                          onChange={onGoalChange}
                        />
                        {goal}
                      </label>
                    ))}
                    <label>
                      <input
                        type="checkbox"
                        value="Other"
                        checked={(formData.goals || []).includes('Other')}
                        onChange={onGoalChange}
                      />
                      Other:
                      {formData.goals && formData.goals.includes('Other') && (
                        <input
                          value={formData.goals_other}
                          onChange={(e) => updateField('goals_other', e.target.value)}
                          placeholder="Please specify"
                          style={{ marginLeft: '10px', padding: '8px 12px', border: '2px solid #d1d5db', fontSize: '0.85rem' }}
                        />
                      )}
                    </label>
                  </div>
                  {touched.goals && (!formData.goals || formData.goals.length === 0) && (
                    <div className="error-message">Please select at least one goal.</div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Features & Design */}
            {step === 2 && (
              <div className="form-step">
                <h3 className="step-title">Features & Design</h3>
                <div className="form-group">
                  <label>Required Features *</label>
                  <div className={`checkbox-group required-field ${touched.features && (!formData.features || formData.features.length === 0) ? 'error' : ''}`}>
                    {featuresList.map((feature) => (
                      <label key={feature}>
                        <input
                          type="checkbox"
                          value={feature}
                          checked={(formData.features || []).includes(feature)}
                          onChange={onFeatureChange}
                        />
                        {feature}
                      </label>
                    ))}
                    <label>
                      <input
                        type="checkbox"
                        value="Other"
                        checked={(formData.features || []).includes('Other')}
                        onChange={onFeatureChange}
                      />
                      Other:
                      {formData.features && formData.features.includes('Other') && (
                        <input
                          value={formData.features_other}
                          onChange={(e) => updateField('features_other', e.target.value)}
                          placeholder="Please specify"
                          style={{ marginLeft: '10px', padding: '8px 12px', border: '2px solid #d1d5db', fontSize: '0.85rem' }}
                        />
                      )}
                    </label>
                  </div>
                  {touched.features && (!formData.features || formData.features.length === 0) && (
                    <div className="error-message">Please select at least one feature.</div>
                  )}
                </div>
                <div className="form-group">
                  <label>Design Style Preference</label>
                  <div className="checkbox-group">
                    {stylesList.map((style) => (
                      <label key={style}>
                        <input
                          type="checkbox"
                          value={style}
                          checked={(formData.styles || []).includes(style)}
                          onChange={onStyleChange}
                        />
                        {style}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Timeline & Budget */}
            {step === 3 && (
              <div className="form-step">
                <h3 className="step-title">Timeline & Budget</h3>
                <div className="form-group">
                  <label htmlFor="budget">Project Budget Range *</label>
                  <select
                    id="budget"
                    value={formData.budget}
                    onChange={(e) => updateField('budget', e.target.value)}
                    required
                    className={`required-field ${touched.budget && !formData.budget ? 'error' : ''}`}
                  >
                    <option value="">Select</option>
                    <option>$500 - $1,500</option>
                    <option>$1,500 - $3,000</option>
                    <option>$3,000 - $5,000</option>
                    <option>$5,000 - $10,000</option>
                    <option>$10,000+</option>
                    <option>Let's discuss</option>
                  </select>
                  {touched.budget && !formData.budget && (
                    <div className="error-message">Please select a budget range.</div>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="timeline">Desired Launch Date *</label>
                  <select
                    id="timeline"
                    value={formData.timeline}
                    onChange={(e) => updateField('timeline', e.target.value)}
                    required
                    className={`required-field ${touched.timeline && !formData.timeline ? 'error' : ''}`}
                  >
                    <option value="">Select</option>
                    <option>Within 1-2 weeks</option>
                    <option>Within 2-4 weeks</option>
                    <option>Within 1-2 months</option>
                  </select>
                  {touched.timeline && !formData.timeline && (
                    <div className="error-message">Please select a timeline.</div>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Current Website */}
            {step === 4 && (
              <div className="form-step">
                <h3 className="step-title">Current Website</h3>
                <div className="form-group">
                  <label>Do you have an existing website? *</label>
                  <div className={`radio-group required-field ${touched.has_website && !formData.has_website ? 'error' : ''}`}>
                    <label>
                      <input
                        type="radio"
                        value="Yes"
                        checked={formData.has_website === 'Yes'}
                        onChange={(e) => updateField('has_website', e.target.value)}
                      />
                      Yes
                    </label>
                    <label>
                      <input
                        type="radio"
                        value="No"
                        checked={formData.has_website === 'No'}
                        onChange={(e) => updateField('has_website', e.target.value)}
                      />
                      No
                    </label>
                  </div>
                  {touched.has_website && !formData.has_website && (
                    <div className="error-message">Please select whether you have an existing website.</div>
                  )}
                </div>
                {formData.has_website === 'Yes' && (
                  <>
                    <div className="form-group">
                      <label htmlFor="website_url">Website URL</label>
                      <input
                        id="website_url"
                        value={formData.website_url}
                        onChange={(e) => updateField('website_url', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="current_host">Which host do you use?</label>
                      <input
                        id="current_host"
                        value={formData.current_host}
                        onChange={(e) => updateField('current_host', e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 6: Additional Details */}
            {step === 5 && (
              <div className="form-step">
                <h3 className="step-title">Additional Details</h3>
                <div className="form-group">
                  <label>Do you have existing branding? *</label>
                  <div className={`radio-group required-field ${touched.branding && !formData.branding ? 'error' : ''}`}>
                    <label>
                      <input
                        type="radio"
                        value="Yes"
                        checked={formData.branding === 'Yes'}
                        onChange={(e) => updateField('branding', e.target.value)}
                      />
                      Yes
                    </label>
                    <label>
                      <input
                        type="radio"
                        value="No"
                        checked={formData.branding === 'No'}
                        onChange={(e) => updateField('branding', e.target.value)}
                      />
                      No
                    </label>
                    <label>
                      <input
                        type="radio"
                        value="Partial"
                        checked={formData.branding === 'Partial'}
                        onChange={(e) => updateField('branding', e.target.value)}
                      />
                      Partial
                    </label>
                  </div>
                  {touched.branding && !formData.branding && (
                    <div className="error-message">Please select your branding status.</div>
                  )}
                </div>
                {formData.branding === 'Yes' && (
                  <div className="form-group">
                    <label htmlFor="branding_details">Logo, colors, fonts, credentials available?</label>
                    <input
                      id="branding_details"
                      value={formData.branding_details}
                      onChange={(e) => updateField('branding_details', e.target.value)}
                    />
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="content_status">Content Status *</label>
                  <select
                    id="content_status"
                    value={formData.content_status}
                    onChange={(e) => updateField('content_status', e.target.value)}
                    required
                    className={`required-field ${touched.content_status && !formData.content_status ? 'error' : ''}`}
                  >
                    <option value="">Select</option>
                    <option>I have all content ready</option>
                    <option>I have some content, need help with rest</option>
                    <option>I need help creating all content</option>
                    <option>I need copywriting services</option>
                  </select>
                  {touched.content_status && !formData.content_status && (
                    <div className="error-message">Please select your content status.</div>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="reference_websites">Reference Websites (optional)</label>
                  <textarea
                    id="reference_websites"
                    value={formData.reference_websites}
                    onChange={(e) => updateField('reference_websites', e.target.value)}
                    rows="2"
                  ></textarea>
                </div>
                <div className="form-group">
                  <label htmlFor="special_requirements">Special Requirements or Concerns</label>
                  <textarea
                    id="special_requirements"
                    value={formData.special_requirements}
                    onChange={(e) => updateField('special_requirements', e.target.value)}
                    rows="2"
                  ></textarea>
                </div>
                <div className="form-group">
                  <label htmlFor="hear_about_us">How did you hear about Chapadevs?</label>
                  <select
                    id="hear_about_us"
                    value={formData.hear_about_us}
                    onChange={(e) => updateField('hear_about_us', e.target.value)}
                  >
                    <option value="">Select</option>
                    <option>Google search</option>
                    <option>Social media</option>
                    <option>Referral</option>
                    <option>Previous client</option>
                    <option>Other</option>
                  </select>
                  {formData.hear_about_us === 'Other' && (
                    <input
                      value={formData.hear_about_us_other}
                      onChange={(e) => updateField('hear_about_us_other', e.target.value)}
                      placeholder="Please specify"
                      style={{ marginTop: '8px', width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: '0' }}
                    />
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="additional_comments">Additional Comments</label>
                  <textarea
                    id="additional_comments"
                    value={formData.additional_comments}
                    onChange={(e) => updateField('additional_comments', e.target.value)}
                    rows="2"
                    placeholder="Anything else you'd like us to know about your project?"
                  ></textarea>
                </div>
              </div>
            )}

            {/* Step 7: Review & Submit */}
            {step === 6 && (
              <div className="form-step">
                <h3 className="step-title">Review & Submit</h3>
                <div className="review-section">
                  {reviewFields.map((field) => {
                    const value = Array.isArray(formData[field.key])
                      ? formData[field.key].join(', ')
                      : formData[field.key] || 'Not provided'
                    return (
                      <div key={field.key}>
                        <div className="review-label">{field.label}</div>
                        <div className="review-value">{value}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="wizard-navigation">
              <button
                className="btn"
                type="button"
                onClick={prevStep}
                disabled={step === 0}
              >
                Back
              </button>
              {step < steps.length - 1 ? (
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    console.log('Next button clicked, current step:', step)
                    console.log('Validation result:', validateStep())
                    
                    // Mark all required fields in current step as touched first
                    if (step === 0) {
                      markFieldsAsTouched(['from_name', 'from_email', 'contact_method'])
                    } else if (step === 1) {
                      markFieldsAsTouched(['project_type', 'project_description', 'goals'])
                    } else if (step === 2) {
                      markFieldsAsTouched(['features'])
                    } else if (step === 3) {
                      markFieldsAsTouched(['budget', 'timeline'])
                    } else if (step === 4) {
                      markFieldsAsTouched(['has_website'])
                    } else if (step === 5) {
                      markFieldsAsTouched(['branding', 'content_status'])
                    }
                    
                    // Then validate and move to next step if valid
                    if (validateStep()) {
                      setValidationMessage('')
                      nextStep()
                    } else {
                      // Show validation error message
                      setValidationMessage('Please fill in all required fields before continuing.')
                      
                      // Scroll to first error after a short delay to ensure DOM is updated
                      setTimeout(() => {
                        const errorElement = document.querySelector('.error')
                        if (errorElement) {
                          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }
                      }, 100)
                      
                      // Clear validation message after 5 seconds
                      setTimeout(() => {
                        setValidationMessage('')
                      }, 5000)
                    }
                  }}
                >
                  Next
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending...' : 'Submit Inquiry'}
                </button>
              )}
            </div>

            {validationMessage && (
              <div className="submit-message error" style={{ marginTop: '1rem' }}>
                {validationMessage}
              </div>
            )}

            {submitMessage && (
              <div
                className={`submit-message ${submitSuccess ? 'success' : 'error'}`}
              >
                {submitMessage}
              </div>
            )}
          </form>
        </div>
      </div>
    </section>
  )
}

export default InquiryForm

