import AIPreview from '../models/AIPreview.js'
import { getDefaultQuestionsForPhase } from './phaseWorkflow.js'

/**
 * Extracts project phase definitions from the latest completed AI preview analysis for a project.
 * The AI analysis returns JSON with timeline.phases: [{ phase, weeks, deliverables }].
 *
 * @param {import('mongoose').Types.ObjectId} projectId
 * @returns {Promise<Array<{ title: string, description: string | null, order: number, deliverables: string[] }> | null>}
 *   Phase definitions ready for ProjectPhase creation, or null if no preview or parse failed.
 */
export async function getPhasesFromAIAnalysis(projectId) {
  const preview = await AIPreview.findOne({
    projectId,
    status: 'completed',
  })
    .sort({ createdAt: -1 })
    .select('previewResult')
    .lean()

  if (!preview?.previewResult) return null

  let raw = preview.previewResult.trim()
  // Strip markdown code block if present
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '')
  }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  const phases = parsed?.timeline?.phases
  if (!Array.isArray(phases) || phases.length === 0) return null

  return phases.map((p, index) => {
    const title = typeof p.phase === 'string' ? p.phase.trim() : `Phase ${index + 1}`
    const weeks = typeof p.weeks === 'number' ? p.weeks : null
    const description = weeks != null ? `${weeks} week${weeks !== 1 ? 's' : ''}` : null
    const deliverables = Array.isArray(p.deliverables)
      ? p.deliverables.map((d) => (typeof d === 'string' ? d.trim() : String(d))).filter(Boolean)
      : []

    return {
      title: title || `Phase ${index + 1}`,
      description,
      order: index + 1,
      deliverables,
    }
  })
}

/**
 * Extracts client questions for a specific phase from AI preview analysis.
 * Falls back to default questions if none found in analysis.
 *
 * @param {import('mongoose').Types.ObjectId} projectId
 * @param {string} phaseTitle - Phase title to extract questions for
 * @returns {Promise<Array<{ question: string, required: boolean, order: number }>>}
 */
export async function extractClientQuestionsFromPreview(projectId, phaseTitle) {
  const preview = await AIPreview.findOne({
    projectId,
    status: 'completed',
  })
    .sort({ createdAt: -1 })
    .select('previewResult')
    .lean()

  if (!preview?.previewResult) {
    // No preview, return default questions
    return getDefaultQuestionsForPhase(phaseTitle)
  }

  let raw = preview.previewResult.trim()
  // Strip markdown code block if present
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '')
  }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Parse failed, return default questions
    return getDefaultQuestionsForPhase(phaseTitle)
  }

  // Try to extract questions from analysis
  // Look for questions in recommendations, risks, or a dedicated questions field
  const questions = []

  // Check for dedicated questions field
  if (parsed.questions && Array.isArray(parsed.questions)) {
    parsed.questions.forEach((q, index) => {
      if (typeof q === 'string') {
        questions.push({
          question: q,
          required: false,
          order: index + 1,
        })
      } else if (q && typeof q === 'object') {
        questions.push({
          question: q.question || q.text || String(q),
          required: q.required || false,
          order: q.order || index + 1,
        })
      }
    })
  }

  // Extract from recommendations if available
  if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
    parsed.recommendations.forEach((rec, index) => {
      if (typeof rec === 'string' && rec.includes('?')) {
        questions.push({
          question: rec,
          required: false,
          order: questions.length + 1,
        })
      }
    })
  }

  // If no questions found, use defaults
  if (questions.length === 0) {
    return getDefaultQuestionsForPhase(phaseTitle)
  }

  return questions
}
