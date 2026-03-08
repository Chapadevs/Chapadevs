/**
 * Phase object with requiresClientApproval, clientApproved.
 * Defaults requiresClientApproval to true for legacy phases (undefined).
 */
export function isPendingApproval(phase) {
  if (!phase) return false
  const requiresApproval = phase.requiresClientApproval !== false
  return Boolean(requiresApproval && !phase.clientApproved)
}

/**
 * Phase is awaiting client approval only when in_progress and requires approval but not yet approved.
 * Phases in not_started or completed should not count as "awaiting approval".
 */
export function isPhaseAwaitingApproval(phase) {
  if (!phase) return false
  return (
    phase.status === 'in_progress' &&
    Boolean(phase.requiresClientApproval && !phase.clientApproved)
  )
}

export function getPhasesPendingApproval(phases) {
  if (!Array.isArray(phases)) return []
  return phases.filter(isPhaseAwaitingApproval)
}
