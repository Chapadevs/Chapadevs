/**
 * Phase templates by project type. Used when a project enters Development (assign/accept).
 * Each item: { title, description?, order }
 */
const FULL_TRACK = [
  { title: 'Discovery & Planning', description: 'Requirements, scope, and timeline', order: 1 },
  { title: 'Design', description: 'Wireframes, UI/UX, and design approval', order: 2 },
  { title: 'Development', description: 'Core build and integration', order: 3 },
  { title: 'Testing & QA', description: 'Quality assurance and fixes', order: 4 },
  { title: 'Launch & Handoff', description: 'Deployment and delivery', order: 5 },
]

const SHORT_TRACK = [
  { title: 'Planning', description: 'Scope and approach', order: 1 },
  { title: 'Implementation', description: 'Build and updates', order: 2 },
  { title: 'Review & Launch', description: 'QA and delivery', order: 3 },
]

const DEFAULT_TRACK = [
  { title: 'Planning', description: 'Scope, requirements, and approach', order: 1 },
  { title: 'Design', description: 'Wireframes, UI/UX, and design approval', order: 2 },
  { title: 'Development', description: 'Core build and integration', order: 3 },
  { title: 'Testing', description: 'Quality assurance and fixes', order: 4 },
  { title: 'Launch', description: 'Deployment and delivery', order: 5 },
]

const PROJECT_TYPE_PHASES = {
  'New Website Design & Development': FULL_TRACK,
  'Website Redesign/Refresh': FULL_TRACK,
  'E-commerce Store': FULL_TRACK,
  'Web Application': FULL_TRACK,
  'Landing Page': SHORT_TRACK,
  'Maintenance/Updates to Existing Site': SHORT_TRACK,
  'Other': DEFAULT_TRACK,
}

/**
 * Returns phase definitions for a project type.
 * @param {string|null} projectType - Project.projectType
 * @returns {Array<{ title: string, description?: string, order: number }>}
 */
export function getPhasesForProjectType(projectType) {
  if (!projectType) return DEFAULT_TRACK
  return PROJECT_TYPE_PHASES[projectType] || DEFAULT_TRACK
}
