/**
 * Phase approval helpers – single source of truth for "pending approval" and "phases needing approval".
 */

/**
 * @param {Object} phase - Phase object with requiresClientApproval, clientApproved
 * @returns {boolean}
 */
export function isPendingApproval(phase) {
  if (!phase) return false
  return Boolean(phase.requiresClientApproval && !phase.clientApproved)
}

/**
 * @param {Object[]} phases - Array of phase objects
 * @returns {Object[]} Phases that need approval, in original order
 */
export function getPhasesPendingApproval(phases) {
  if (!Array.isArray(phases)) return []
  return phases.filter(isPendingApproval)
}
