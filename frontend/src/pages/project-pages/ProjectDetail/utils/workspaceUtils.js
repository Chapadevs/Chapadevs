/**
 * Workspace/cycle utilities shared by CycleDetail, WeekTimeline, CalendarTab, and related components.
 */

/**
 * Returns the effective status of a sub-step (handles legacy completed flag).
 */
export function getSubStepStatus(s) {
  return s?.status ?? (s?.completed ? 'completed' : 'pending')
}

/**
 * Parses a sub-step ID from DnD or phase proposal format.
 * Returns { phaseIdx, subIdx } for phase-X-substep-Y, or null.
 */
export function matchSubStepId(id) {
  const m = String(id).match(/^phase-(\d+)-substep-(\d+)$/)
  return m ? { phaseIdx: parseInt(m[1], 10), subIdx: parseInt(m[2], 10) } : null
}

/**
 * Returns the phase index from a phase-X-substep-Y id, or null.
 */
export function matchPhaseIndex(id) {
  const m = String(id).match(/^phase-(\d+)-substep-(\d+)$/)
  return m ? parseInt(m[1], 10) : null
}

/**
 * Finds the assigned user object for a sub-step from the project's programmer list.
 */
export function getAssignedUser(step, project) {
  if (!step?.assignedTo) return null

  if (typeof step.assignedTo === 'object' && step.assignedTo !== null && step.assignedTo._id !== undefined) {
    return step.assignedTo
  }

  const id = step.assignedTo?.toString?.() || step.assignedTo
  if (!id) return null

  const main = project?.assignedProgrammerId
  if (main && typeof main === 'object' && (main._id?.toString() === id || main?.toString() === id)) {
    return main
  }
  const list = project?.assignedProgrammerIds || []
  for (const p of list) {
    if (typeof p !== 'object') continue
    const pid = p._id?.toString?.() || p?.toString?.()
    if (pid === id) return p
  }
  return null
}

/**
 * Finds the index of a sub-step in a sorted array by ID or order-based fallback.
 */
export function findSubStepIndex(sortedSubSteps, id) {
  const str = String(id)
  return sortedSubSteps.findIndex((s) => {
    const sid = (s._id ?? s.id)?.toString?.() ?? String(s._id ?? s.id)
    return sid === str || `substep-${s.order ?? 0}` === str
  })
}
