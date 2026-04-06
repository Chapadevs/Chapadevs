import { TECH_STACK_OPTIONS } from './techStack'

const ALLOWED_TECH = new Set(TECH_STACK_OPTIONS.map((o) => o.value))

const PROJECT_TYPES = [
  'New Website Design & Development',
  'Website Redesign/Refresh',
  'E-commerce Store',
  'Management Panel / ERP / CRM',
  'Landing Page',
  'Web Application',
  'Maintenance/Updates to Existing Site',
  'Other',
]

/**
 * Maps one AI website idea + original prompt into CreateProject form fields.
 */
export function mapIdeaToCreateProjectDraft(idea, sourcePrompt = '') {
  if (!idea || typeof idea !== 'object') {
    return null
  }

  const prompt = typeof sourcePrompt === 'string' ? sourcePrompt : ''
  const pd = idea.previewDirection || {}

  const descParts = [
    idea.summary,
    idea.whoItFits,
    pd.homepageConcept,
    pd.visualStyle && `Visual direction: ${pd.visualStyle}`,
    pd.layoutVibe && `Layout: ${pd.layoutVibe}`,
    Array.isArray(idea.suggestedPages) && idea.suggestedPages.length
      ? `Suggested pages: ${idea.suggestedPages.join(', ')}`
      : null,
  ].filter(Boolean)

  let projectType =
    typeof idea.suggestedProjectType === 'string' ? idea.suggestedProjectType.trim() : ''
  if (!PROJECT_TYPES.includes(projectType)) {
    projectType = 'New Website Design & Development'
  }

  const tech = (Array.isArray(idea.suggestedTechnologies) ? idea.suggestedTechnologies : [])
    .map((t) => (typeof t === 'string' ? t.trim() : ''))
    .filter((t) => ALLOWED_TECH.has(t))

  const keyFeatures = Array.isArray(idea.keyFeatures) ? idea.keyFeatures.filter(Boolean) : []
  const goalsLine = keyFeatures.slice(0, 4).join(', ')
  const featuresLine = keyFeatures.join(', ')

  let designStyles = 'Modern, Professional'
  if (typeof pd.visualStyle === 'string' && pd.visualStyle.trim()) {
    const parts = pd.visualStyle
      .split(/,|\/|&|\band\b/gi)
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && s.length < 40)
      .slice(0, 4)
    if (parts.length) designStyles = parts.join(', ')
  }

  return {
    title: (idea.title || 'Website project').slice(0, 500),
    description: descParts.join('\n\n').slice(0, 8000),
    projectType,
    goals: goalsLine,
    features: featuresLine || goalsLine,
    designStyles,
    technologies:
      tech.length > 0 ? tech : ['React', 'TypeScript', 'Tailwind CSS', 'Node.js', 'MongoDB'],
    additionalComments: [
      '— Selected from Chapadevs website ideas',
      prompt ? `Original brief: ${prompt.slice(0, 1500)}` : null,
      idea.key ? `Idea ref: ${idea.key}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
  }
}
