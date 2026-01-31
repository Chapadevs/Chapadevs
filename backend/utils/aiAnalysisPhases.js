import AIPreview from '../models/AIPreview.js'

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
