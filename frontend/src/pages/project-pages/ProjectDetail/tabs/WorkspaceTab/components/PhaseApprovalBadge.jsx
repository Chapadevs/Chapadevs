/**
 * Shared approval badge for timeline step, card, and phase modal.
 * Uses same style as timeline-pending-approvals-link (ghost button).
 */
const PhaseApprovalBadge = ({
  requiresApproval,
  approved,
  variant = 'modal',
}) => {
  if (!requiresApproval) return null

  const badgeBaseClass = 'approval-badge approval-badge--ghost-style inline-flex items-center justify-center font-button font-extrabold rounded-none uppercase tracking-wider border-2 px-3 py-1.5 text-sm min-h-[28px]'

  if (approved) {
    if (variant === 'modal') {
      return (
        <span className={`${badgeBaseClass} approval-badge--approved bg-primary/10 text-primary border-primary`}>
          ✓ Approved
        </span>
      )
    }
    return null
  }

  if (variant === 'step') {
    return (
      <div className="project-phase-step-approval-badge" title="Requires client approval">
        ⚠
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <span className={`project-phase-card-approval-badge ${badgeBaseClass} approval-badge--pending`} title="Requires client approval">
        ⚠ Pending approval
      </span>
    )
  }

  if (variant === 'modal') {
    return (
      <span className={`${badgeBaseClass} approval-badge--pending bg-transparent text-primary border-transparent`}>
        ⚠ Pending Approval
      </span>
    )
  }

  return null
}

export default PhaseApprovalBadge
