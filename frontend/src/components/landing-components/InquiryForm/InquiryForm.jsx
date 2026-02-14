import React, { useState } from 'react'
import { submitInquiry } from '../../../services/api'
import { Button, Alert, SectionTitle, Input, Select, Textarea } from '../../ui-components'
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
                <SectionTitle className="step-title mb-4">Contact Information</SectionTitle>
                <Input
                  id="from_name"
                  label="Your Name"
                  required
                  value={formData.from_name}
                  onChange={(e) => updateField('from_name', e.target.value)}
                  onBlur={() => onFieldTouch('from_name')}
                  error={touched.from_name && !formData.from_name ? 'Please enter your name.' : undefined}
                  wrapperClassName="form-group"
                />
                <Input
                  id="from_email"
                  label="Email"
                  required
                  type="email"
                  value={formData.from_email}
                  onChange={(e) => updateField('from_email', e.target.value)}
                  onBlur={() => onFieldTouch('from_email')}
                  error={touched.from_email && (!formData.from_email || !isValidEmail(formData.from_email)) ? 'Please enter a valid email address.' : undefined}
                  wrapperClassName="form-group"
                />
                <Input
                  id="company_name"
                  label="Company/Organization (optional)"
                  value={formData.company_name}
                  onChange={(e) => updateField('company_name', e.target.value)}
                  wrapperClassName="form-group"
                />
                <Input
                  id="phone"
                  label="Phone Number (optional)"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  wrapperClassName="form-group"
                />
                <Select
                  id="contact_method"
                  label="Preferred Contact Method"
                  required
                  value={formData.contact_method}
                  onChange={(e) => updateField('contact_method', e.target.value)}
                  onBlur={() => onFieldTouch('contact_method')}
                  error={touched.contact_method && !formData.contact_method ? 'Please select your preferred contact method.' : undefined}
                  wrapperClassName="form-group"
                >
                  <option value="">Select</option>
                  <option>Email</option>
                  <option>Phone</option>
                  <option>WhatsApp</option>
                </Select>
              </div>
            )}

            {/* Step 2: Project Details */}
            {step === 1 && (
              <div className="form-step">
                <SectionTitle className="step-title mb-4">Project Details</SectionTitle>
                <Select
                  id="project_type"
                  label="Project Type"
                  required
                  value={formData.project_type}
                  onChange={(e) => updateField('project_type', e.target.value)}
                  error={touched.project_type && !formData.project_type ? 'Please select a project type.' : undefined}
                  wrapperClassName="form-group"
                >
                  <option value="">Select</option>
                  <option>New Website Design & Development</option>
                  <option>Website Redesign/Refresh</option>
                  <option>E-commerce Store</option>
                  <option>Landing Page</option>
                  <option>Web Application</option>
                  <option>Maintenance/Updates to Existing Site</option>
                  <option>Other</option>
                </Select>
                <Textarea
                  id="project_description"
                  label="Brief Project Description"
                  required
                  value={formData.project_description}
                  onChange={(e) => updateField('project_description', e.target.value)}
                  rows={3}
                  placeholder="Describe your project in 2-3 sentences"
                  error={touched.project_description && !formData.project_description ? 'Please provide a project description.' : undefined}
                  wrapperClassName="form-group"
                />
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
                        <Input
                          value={formData.goals_other}
                          onChange={(e) => updateField('goals_other', e.target.value)}
                          placeholder="Please specify"
                          wrapperClassName="mt-2"
                        />
                      )}
                    </label>
                  </div>
                  {touched.goals && (!formData.goals || formData.goals.length === 0) && (
                    <Alert variant="error">Please select at least one goal.</Alert>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Features & Design */}
            {step === 2 && (
              <div className="form-step">
                <SectionTitle className="step-title mb-4">Features & Design</SectionTitle>
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
                        <Input
                          value={formData.features_other}
                          onChange={(e) => updateField('features_other', e.target.value)}
                          placeholder="Please specify"
                          wrapperClassName="mt-2"
                        />
                      )}
                    </label>
                  </div>
                  {touched.features && (!formData.features || formData.features.length === 0) && (
                    <Alert variant="error">Please select at least one feature.</Alert>
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
                <SectionTitle className="step-title mb-4">Timeline & Budget</SectionTitle>
                <Select
                  id="budget"
                  label="Project Budget Range"
                  required
                  value={formData.budget}
                  onChange={(e) => updateField('budget', e.target.value)}
                  error={touched.budget && !formData.budget ? 'Please select a budget range.' : undefined}
                  wrapperClassName="form-group"
                >
                  <option value="">Select</option>
                  <option>$500 - $1,500</option>
                  <option>$1,500 - $3,000</option>
                  <option>$3,000 - $5,000</option>
                  <option>$5,000 - $10,000</option>
                  <option>$10,000+</option>
                  <option>Let's discuss</option>
                </Select>
                <Select
                  id="timeline"
                  label="Desired Launch Date"
                  required
                  value={formData.timeline}
                  onChange={(e) => updateField('timeline', e.target.value)}
                  error={touched.timeline && !formData.timeline ? 'Please select a timeline.' : undefined}
                  wrapperClassName="form-group"
                >
                  <option value="">Select</option>
                  <option>Within 1-2 weeks</option>
                  <option>Within 2-4 weeks</option>
                  <option>Within 1-2 months</option>
                </Select>
              </div>
            )}

            {/* Step 5: Current Website */}
            {step === 4 && (
              <div className="form-step">
                <SectionTitle className="step-title mb-4">Current Website</SectionTitle>
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
                    <Alert variant="error">Please select whether you have an existing website.</Alert>
                  )}
                </div>
                {formData.has_website === 'Yes' && (
                  <>
                    <Input
                      id="website_url"
                      label="Website URL"
                      value={formData.website_url}
                      onChange={(e) => updateField('website_url', e.target.value)}
                      wrapperClassName="form-group"
                    />
                    <Input
                      id="current_host"
                      label="Which host do you use?"
                      value={formData.current_host}
                      onChange={(e) => updateField('current_host', e.target.value)}
                      wrapperClassName="form-group"
                    />
                  </>
                )}
              </div>
            )}

            {/* Step 6: Additional Details */}
            {step === 5 && (
              <div className="form-step">
                <SectionTitle className="step-title mb-4">Additional Details</SectionTitle>
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
                    <Alert variant="error">Please select your branding status.</Alert>
                  )}
                </div>
                {formData.branding === 'Yes' && (
                  <Input
                    id="branding_details"
                    label="Logo, colors, fonts, credentials available?"
                    value={formData.branding_details}
                    onChange={(e) => updateField('branding_details', e.target.value)}
                    wrapperClassName="form-group"
                  />
                )}
                <Select
                  id="content_status"
                  label="Content Status"
                  required
                  value={formData.content_status}
                  onChange={(e) => updateField('content_status', e.target.value)}
                  error={touched.content_status && !formData.content_status ? 'Please select your content status.' : undefined}
                  wrapperClassName="form-group"
                >
                  <option value="">Select</option>
                  <option>I have all content ready</option>
                  <option>I have some content, need help with rest</option>
                  <option>I need help creating all content</option>
                  <option>I need copywriting services</option>
                </Select>
                <Textarea
                  id="reference_websites"
                  label="Reference Websites (optional)"
                  value={formData.reference_websites}
                  onChange={(e) => updateField('reference_websites', e.target.value)}
                  rows={2}
                  wrapperClassName="form-group"
                />
                <Textarea
                  id="special_requirements"
                  label="Special Requirements or Concerns"
                  value={formData.special_requirements}
                  onChange={(e) => updateField('special_requirements', e.target.value)}
                  rows={2}
                  wrapperClassName="form-group"
                />
                <Select
                  id="hear_about_us"
                  label="How did you hear about Chapadevs?"
                  value={formData.hear_about_us}
                  onChange={(e) => updateField('hear_about_us', e.target.value)}
                  wrapperClassName="form-group"
                >
                  <option value="">Select</option>
                  <option>Google search</option>
                  <option>Social media</option>
                  <option>Referral</option>
                  <option>Previous client</option>
                  <option>Other</option>
                </Select>
                {formData.hear_about_us === 'Other' && (
                  <Input
                    value={formData.hear_about_us_other}
                    onChange={(e) => updateField('hear_about_us_other', e.target.value)}
                    placeholder="Please specify"
                    wrapperClassName="mt-2"
                  />
                )}
                <Textarea
                  id="additional_comments"
                  label="Additional Comments"
                  value={formData.additional_comments}
                  onChange={(e) => updateField('additional_comments', e.target.value)}
                  rows={2}
                  placeholder="Anything else you'd like us to know about your project?"
                  wrapperClassName="form-group"
                />
              </div>
            )}

            {/* Step 7: Review & Submit */}
            {step === 6 && (
              <div className="form-step">
                <SectionTitle className="step-title mb-4">Review & Submit</SectionTitle>
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
              <Button variant="ghost" size="md" type="button" onClick={prevStep} disabled={step === 0} className="btn">
                Back
              </Button>
              {step < steps.length - 1 ? (
                <Button
                  variant="primary"
                  size="md"
                  type="button"
                  className="btn btn-primary"
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
                </Button>
              ) : (
                <Button variant="primary" size="md" type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending...' : 'Submit Inquiry'}
                </Button>
              )}
            </div>

            {validationMessage && (
              <Alert variant="error" className="submit-message mt-4">
                {validationMessage}
              </Alert>
            )}

            {submitMessage && (
              <Alert variant={submitSuccess ? 'success' : 'error'} className="submit-message">
                {submitMessage}
              </Alert>
            )}
          </form>
        </div>
      </div>
    </section>
  )
}

export default InquiryForm

