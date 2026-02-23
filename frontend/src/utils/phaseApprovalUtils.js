/**
 * Phase object with requiresClientApproval, clientApproved
 */
export function isPendingApproval(phase) {
  if (!phase) return false
  return Boolean(phase.requiresClientApproval && !phase.clientApproved)
}

export function getPhasesPendingApproval(phases) {
  if (!Array.isArray(phases)) return []
  return phases.filter(isPendingApproval)
}
