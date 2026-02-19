import { useState, useEffect } from 'react'
import { Button, Input, Select } from '../../../../../../../components/ui-components'
import { Textarea } from '../../../../../../../components/shadcn-components/shadcn-textarea/textarea'
import './EditProjectModal.css'

const PROJECT_TYPES = [
  'New Website Design & Development',
  'Website Redesign/Refresh',
  'E-commerce Store',
  'Landing Page',
  'Web Application',
  'Maintenance/Updates to Existing Site',
  'Other',
]

const PRIORITIES = ['low', 'medium', 'high', 'urgent']
const HAS_BRANDING = ['Yes', 'No', 'Partial']

const arrayToText = (arr) => (Array.isArray(arr) ? arr.filter(Boolean).join('\n') : '')
const textToArray = (text) =>
  (text || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

export default function EditProjectModal({ project, onSave, onClose }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: '',
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
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!project) return
    setForm({
      title: project.title ?? '',
      description: project.description ?? '',
      priority: project.priority ?? 'medium',
      projectType: project.projectType ?? '',
      budget: project.budget ?? '',
      timeline: project.timeline ?? '',
      goals: arrayToText(project.goals),
      features: arrayToText(project.features),
      designStyles: arrayToText(project.designStyles),
      technologies: arrayToText(project.technologies),
      hasBranding: project.hasBranding ?? '',
      brandingDetails: project.brandingDetails ?? '',
      contentStatus: project.contentStatus ?? '',
      referenceWebsites: project.referenceWebsites ?? '',
      specialRequirements: project.specialRequirements ?? '',
      additionalComments: project.additionalComments ?? '',
    })
  }, [project])

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  const buildPayload = () => {
    const payload = {
      title: form.title.trim() || undefined,
      description: form.description.trim() || undefined,
      priority: form.priority || undefined,
      projectType: form.projectType || undefined,
      budget: form.budget.trim() || undefined,
      timeline: form.timeline.trim() || undefined,
      goals: textToArray(form.goals),
      features: textToArray(form.features),
      designStyles: textToArray(form.designStyles),
      technologies: textToArray(form.technologies),
      hasBranding: form.hasBranding || undefined,
      brandingDetails: form.brandingDetails.trim() || undefined,
      contentStatus: form.contentStatus.trim() || undefined,
      referenceWebsites: form.referenceWebsites.trim() || undefined,
      specialRequirements: form.specialRequirements.trim() || undefined,
      additionalComments: form.additionalComments.trim() || undefined,
    }
    return Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!form.title?.trim()) {
      setError('Title is required')
      return
    }
    if (!form.description?.trim()) {
      setError('Description is required')
      return
    }
    setSaving(true)
    try {
      const payload = buildPayload()
      const updated = await onSave(payload)
      if (updated) onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update project')
    } finally {
      setSaving(false)
    }
  }

  if (!project) return null

  return (
    <div
      className="edit-project-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-project-modal-title"
      onClick={onClose}
    >
      <div className="edit-project-modal" onClick={(e) => e.stopPropagation()}>
        <div className="edit-project-modal-header">
          <h2 id="edit-project-modal-title" className="edit-project-modal-title font-heading uppercase">
            Edit project
          </h2>
          <Button type="button" variant="ghost" className="edit-project-modal-close" onClick={onClose} aria-label="Close">
            ×
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="edit-project-modal-body">
          {error && (
            <div className="edit-project-modal-error font-body text-sm text-red-600 mb-4">
              {error}
            </div>
          )}

          <section className="edit-project-section">
            <h3 className="edit-project-section-title font-heading text-xs uppercase text-ink-muted">Basic info</h3>
            <div className="edit-project-fields">
              <Input
                label="Title"
                required
                id="edit-title"
                value={form.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Project title"
              />
              <div className="col-span-full">
                <Textarea
                  label="Description"
                  required
                  id="edit-description"
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Project description"
                  rows={4}
                />
              </div>
              <Select
                label="Priority"
                id="edit-priority"
                value={form.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
              >
                <option value="">—</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Select>
              <Select
                label="Project type"
                id="edit-projectType"
                value={form.projectType}
                onChange={(e) => handleChange('projectType', e.target.value)}
              >
                <option value="">—</option>
                {PROJECT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
              <Input
                label="Budget"
                id="edit-budget"
                value={form.budget}
                onChange={(e) => handleChange('budget', e.target.value)}
                placeholder="e.g. $5,000"
              />
              <Input
                label="Timeline"
                id="edit-timeline"
                value={form.timeline}
                onChange={(e) => handleChange('timeline', e.target.value)}
                placeholder="e.g. 8 weeks"
              />
            </div>
          </section>

          <section className="edit-project-section">
            <h3 className="edit-project-section-title font-heading text-xs uppercase text-ink-muted">Requirements (one per line)</h3>
            <div className="edit-project-fields">
              <div className="col-span-full">
                <Textarea
                  label="Goals"
                  id="edit-goals"
                  value={form.goals}
                  onChange={(e) => handleChange('goals', e.target.value)}
                  placeholder="One goal per line"
                  rows={3}
                />
              </div>
              <div className="col-span-full">
                <Textarea
                  label="Features"
                  id="edit-features"
                  value={form.features}
                  onChange={(e) => handleChange('features', e.target.value)}
                  placeholder="One feature per line"
                  rows={3}
                />
              </div>
              <div className="col-span-full">
                <Textarea
                  label="Design styles"
                  id="edit-designStyles"
                  value={form.designStyles}
                  onChange={(e) => handleChange('designStyles', e.target.value)}
                  placeholder="One per line"
                  rows={2}
                />
              </div>
              <div className="col-span-full">
                <Textarea
                  label="Technologies"
                  id="edit-technologies"
                  value={form.technologies}
                  onChange={(e) => handleChange('technologies', e.target.value)}
                  placeholder="One per line"
                  rows={2}
                />
              </div>
            </div>
          </section>

          <section className="edit-project-section">
            <h3 className="edit-project-section-title font-heading text-xs uppercase text-ink-muted">Branding & content</h3>
            <div className="edit-project-fields">
              <Select
                label="Has branding"
                id="edit-hasBranding"
                value={form.hasBranding}
                onChange={(e) => handleChange('hasBranding', e.target.value)}
              >
                <option value="">—</option>
                {HAS_BRANDING.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </Select>
              <Input
                label="Content status"
                id="edit-contentStatus"
                value={form.contentStatus}
                onChange={(e) => handleChange('contentStatus', e.target.value)}
                placeholder="e.g. Draft, Ready"
              />
              <div className="col-span-full">
                <Textarea
                  label="Branding details"
                  id="edit-brandingDetails"
                  value={form.brandingDetails}
                  onChange={(e) => handleChange('brandingDetails', e.target.value)}
                  rows={2}
                />
              </div>
              <div className="col-span-full">
                <Textarea
                  label="Reference websites"
                  id="edit-referenceWebsites"
                  value={form.referenceWebsites}
                  onChange={(e) => handleChange('referenceWebsites', e.target.value)}
                  rows={2}
                />
              </div>
              <div className="col-span-full">
                <Textarea
                  label="Special requirements"
                  id="edit-specialRequirements"
                  value={form.specialRequirements}
                  onChange={(e) => handleChange('specialRequirements', e.target.value)}
                  rows={3}
                />
              </div>
              <div className="col-span-full">
                <Textarea
                  label="Additional comments"
                  id="edit-additionalComments"
                  value={form.additionalComments}
                  onChange={(e) => handleChange('additionalComments', e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </section>

          <div className="edit-project-modal-footer">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
