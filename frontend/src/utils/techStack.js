/**
 * Allowed technology stacks for Chapadevs projects.
 * Team expertise: React, Angular, and the full JavaScript ecosystem.
 * AI analysis and templates are constrained to these stacks.
 */
export const TECH_STACK_OPTIONS = [
  { value: 'React', label: 'React' },
  { value: 'Angular', label: 'Angular' },
  { value: 'Node.js', label: 'Node.js' },
  { value: 'Express', label: 'Express' },
  { value: 'MongoDB', label: 'MongoDB' },
  { value: 'PostgreSQL', label: 'PostgreSQL' },
  { value: 'TypeScript', label: 'TypeScript' },
  { value: 'Next.js', label: 'Next.js' },
  { value: 'Tailwind CSS', label: 'Tailwind CSS' },
]

/** Tech stack grouped by category for UI */
export const TECH_STACK_BY_CATEGORY = {
  frontend: [
    { value: 'React', label: 'React' },
    { value: 'Angular', label: 'Angular' },
    { value: 'TypeScript', label: 'TypeScript' },
    { value: 'Next.js', label: 'Next.js' },
    { value: 'Tailwind CSS', label: 'Tailwind CSS' },
  ],
  backend: [
    { value: 'Node.js', label: 'Node.js' },
    { value: 'Express', label: 'Express' },
  ],
  database: [
    { value: 'MongoDB', label: 'MongoDB' },
    { value: 'PostgreSQL', label: 'PostgreSQL' },
  ],
}

/** Default tech stack description for AI when user doesn't specify */
export const DEFAULT_TECH_STACK_DESCRIPTION =
  'React or Angular, Node.js, Express, MongoDB or PostgreSQL — JavaScript/TypeScript only'
