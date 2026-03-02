/**
 * Expands phases that have no subSteps/todos into phases with rule-based subSteps and todos.
 * Used when the programmer has phase titles/descriptions but no AI context was generated.
 */

import { getProjectDurationFromDates } from './projectDuration.js'
import { generateSubStepTodos } from './subStepTodoGenerator.js'

const PHASE_TO_SUBSTEPS = {
  'information gathering': [
    'Gather and document requirements',
    'Define scope and milestones',
    'Stakeholder kickoff',
  ],
  'requirements': [
    'Document scope',
    'Define milestones',
    'Review and approve',
  ],
  'planning': [
    'Discovery session',
    'Requirements documentation',
    'Timeline agreement',
  ],
  'design': [
    'Create wireframes for main flows',
    'Client design review',
    'Design approval',
  ],
  'development': [
    'Implement core features',
    'Integration and testing',
    'Code review',
  ],
  'testing': [
    'Unit and integration testing',
    'User acceptance testing',
    'Fix identified issues',
  ],
  'qa': [
    'Run test suite',
    'Document results',
    'Regression testing',
  ],
  'launch': [
    'Production deployment',
    'Client handoff',
    'Post-launch checklist',
  ],
  'handoff': [
    'Deploy and verify',
    'Documentation',
    'Training session',
  ],
}

function inferSubStepsForPhase(title, description) {
  const text = `${title || ''} ${description || ''}`.toLowerCase()
  for (const [key, subSteps] of Object.entries(PHASE_TO_SUBSTEPS)) {
    if (text.includes(key)) return subSteps
  }
  return ['Setup and planning', 'Implementation', 'Review and complete']
}

/**
 * Expands phases with empty subSteps into phases with subSteps and todos.
 * @param {Array} phases - Phase definitions with title, description, weeks, etc. (may have empty subSteps)
 * @param {Object} project - Project for duration context
 * @returns {Array} Phases with subSteps and todos filled in
 */
export function expandPhasesWithSubSteps(phases, project) {
  const dateDuration = getProjectDurationFromDates(project)
  const totalDays = dateDuration?.totalDays ?? (parseInt(project?.timeline, 10) || 8) * 7
  const phaseCount = Math.max(1, phases?.length ?? 1)
  const daysPerPhase = Math.max(1, Math.floor(totalDays / phaseCount))

  return (phases || []).map((p, i) => {
    const existingSubSteps = Array.isArray(p.subSteps) ? p.subSteps.filter((s) => (s?.title || '').trim()) : []
    if (existingSubSteps.length > 0) {
      return {
        ...p,
        subSteps: existingSubSteps.map((s, j) => ({
          ...s,
          order: j + 1,
          todos: Array.isArray(s.todos) && s.todos.length > 0
            ? s.todos.map((t, k) => ({ text: t.text ?? '', order: k + 1 })).filter((t) => t.text)
            : generateSubStepTodos({
                title: s.title,
                estimatedDurationDays: Math.max(1, daysPerPhase / Math.max(1, existingSubSteps.length)),
                deliverables: p.deliverables || [],
              }),
        })),
      }
    }

    const subStepTitles = inferSubStepsForPhase(p.title, p.description)
    const subSteps = subStepTitles.map((title, j) => {
      const estimatedDays = Math.max(1, Math.floor(daysPerPhase / subStepTitles.length))
      const todos = generateSubStepTodos({
        title,
        estimatedDurationDays: estimatedDays,
        deliverables: Array.isArray(p.deliverables) ? p.deliverables : [],
      })
      return {
        title,
        order: j + 1,
        todos,
      }
    })

    return {
      ...p,
      order: (p.order ?? 0) || i + 1,
      weeks: p.weeks ?? daysPerPhase / 7,
      deliverables: Array.isArray(p.deliverables) ? p.deliverables : [],
      subSteps,
    }
  })
}
