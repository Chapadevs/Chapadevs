/**
 * Workspace proposal prompt builder for Vertex AI.
 * Builds prompts that consume project data, AI preview analysis, and generated code structure
 * to produce rich phases and sub-steps for the Workspace.
 */

import { getProjectDurationFromDates } from '../../utils/projectDuration.js'

/**
 * Build prompt for AI-powered Workspace proposal generation.
 * @param {Object} project - Project document (or lean object)
 * @param {Object} context - { analysis, codeStructure }
 * @returns {string} Prompt for the model
 */
export function buildWorkspaceProposalPrompt(project, context = {}) {
  const { analysis = {}, codeStructure = {} } = context

  const projectSection = buildProjectSection(project)
  const analysisSection = buildAnalysisSection(analysis)
  const codeStructureSection = buildCodeStructureSection(codeStructure)
  const outputSchemaSection = buildOutputSchemaSection(project)

  return `You are an expert project manager and web development lead. Generate a detailed development timeline (phases and sub-steps) for a web project. The programmer will use this as the Workspace to guide development.

${projectSection}

${analysisSection}

${codeStructureSection}

${outputSchemaSection}

Respond ONLY with valid JSON. No markdown code fences, no extra text. Generate the timeline now:`
}

function buildProjectSection(project) {
  if (!project) return 'PROJECT: No project data available.'
  const parts = []
  if (project.title) parts.push(`Title: ${project.title}`)
  if (project.description) parts.push(`Description: ${project.description}`)
  if (project.projectType) parts.push(`Type: ${project.projectType}`)
  if (project.budget) parts.push(`Budget: ${project.budget}`)
  const dateDuration = getProjectDurationFromDates(project)
  const totalDaysFromDates = dateDuration?.totalDays ?? null
  if (totalDaysFromDates != null) {
    parts.push(`Total timeline: ${totalDaysFromDates} days (from start date to due date)`)
  } else if (project.timeline) {
    const w = parseInt(project.timeline, 10) || 8
    parts.push(`Total timeline: ${w * 7} days`)
  }
  if (project.startDate) parts.push(`Start date: ${project.startDate}`)
  if (project.dueDate) parts.push(`Due date: ${project.dueDate}`)
  if (project.goals?.length) parts.push(`Goals: ${project.goals.join('; ')}`)
  if (project.features?.length) parts.push(`Features: ${project.features.join('; ')}`)
  if (project.designStyles?.length) parts.push(`Design styles: ${project.designStyles.join(', ')}`)
  if (project.technologies?.length) parts.push(`Technologies: ${project.technologies.join(', ')}`)
  if (project.specialRequirements) parts.push(`Special requirements: ${project.specialRequirements}`)
  if (project.additionalComments) parts.push(`Additional comments: ${project.additionalComments}`)
  return `PROJECT:\n${parts.length ? parts.join('\n') : 'No project data.'}`
}

function buildAnalysisSection(analysis) {
  if (!analysis || typeof analysis !== 'object') return ''
  const parts = []
  if (analysis.overview) parts.push(`Overview: ${analysis.overview}`)
  if (analysis.features?.length) parts.push(`Features from AI: ${analysis.features.join('; ')}`)
  if (analysis.timeline?.phases?.length) {
    parts.push('Suggested phases from AI analysis:')
    analysis.timeline.phases.forEach((p, i) => {
      const days = p.weeks != null ? Math.round(p.weeks * 7) : null
      parts.push(`  ${i + 1}. ${p.phase} (${days != null ? `${days} days` : '?'}): ${(p.deliverables || []).join(', ')}`)
    })
  }
  if (analysis.risks?.length) parts.push(`Risks: ${analysis.risks.join('; ')}`)
  if (analysis.recommendations?.length) parts.push(`Recommendations: ${analysis.recommendations.join('; ')}`)
  if (analysis.budgetBreakdown?.breakdown?.length) {
    parts.push('Budget breakdown: ' + analysis.budgetBreakdown.breakdown.map(b => `${b.category}: ${b.percentage}%`).join(', '))
  }
  if (parts.length === 0) return ''
  return `AI PREVIEW ANALYSIS:\n${parts.join('\n')}`
}

function buildCodeStructureSection(codeStructure) {
  const { pages = [], components = [] } = codeStructure
  if (pages.length === 0 && components.length === 0) return ''
  const parts = []
  if (pages.length) parts.push(`Generated pages: ${pages.join(', ')}`)
  if (components.length) parts.push(`Key components: ${components.join(', ')}`)
  return `GENERATED CODE STRUCTURE (use these to create Development sub-steps):\n${parts.join('\n')}\nFor Development phase, create sub-steps like "Implement HomePage", "Build ProductsPage with product grid", "Wire up authentication" based on these files.`
}

function buildOutputSchemaSection(project) {
  const dateDuration = getProjectDurationFromDates(project)
  const totalDaysFromDates = dateDuration?.totalDays ?? null
  const timelineWeeks = parseInt(project?.timeline, 10) || 8
  const totalDays = totalDaysFromDates ?? timelineWeeks * 7
  const targetWeeks = totalDays / 7

  return `OUTPUT FORMAT (JSON only):

{
  "phases": [
    {
      "title": "Phase name (e.g. Planning & Requirements)",
      "description": "Brief textual description of what this phase accomplishes.",
      "order": 1,
      "weeks": ${(totalDays / 7 / 4).toFixed(2)},
      "deliverables": ["Deliverable 1", "Deliverable 2"],
      "subSteps": [
        {
          "title": "Actionable task title",
          "order": 1,
          "todos": [
            { "text": "Granular task 1", "order": 1 },
            { "text": "Granular task 2", "order": 2 }
          ]
        }
      ]
    }
  ]
}

RULES (project has ${totalDays} days total):
- All durations are in DAYS. Store each phase duration as weeks = days/7 (e.g. 3 days = 0.43).
- The sum of all phase weeks MUST equal ${targetWeeks.toFixed(2)} (i.e. ${totalDays} days total).
- Output 4–6 phases: Planning/Discovery, Design, Development, Testing, Launch (or similar).
- Each phase should have 3–8 sub-steps. Sub-steps must be actionable (e.g. "Implement HomePage", "Create wireframes").
- For Development phase: use generated page/component names to create specific sub-steps.
- description: textual description of the phase. Do NOT put duration in description — use the weeks field.
- weeks: days ÷ 7. Sum of phase weeks = ${targetWeeks.toFixed(2)}.
- deliverables: high-level outputs; subSteps: granular tasks for the programmer.
- order: 1-based for phases and sub-steps.
- If no subSteps, omit the field or use empty array.
- For each sub-step, output a "todos" array with 2–6 granular, actionable tasks. Base them on: (a) sub-step title, (b) phase duration (days = weeks×7), (c) phase deliverables. Tasks should be specific (e.g. "Create wireframe for main flow", "Implement API integration", "Run unit tests").`
}
