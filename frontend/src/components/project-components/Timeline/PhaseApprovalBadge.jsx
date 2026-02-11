/**
 * Shared approval badge for timeline step, card, and phase modal.
 * Renders nothing when the phase does not require approval.
 */
const PhaseApprovalBadge = ({
  requiresApproval,
  approved,
  variant = 'modal',
}) => {
  if (!requiresApproval) return null

  if (approved) {
    if (variant === 'modal') {
      return (
        <span className="approval-badge approved">
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
      <span className="project-phase-card-approval-badge" title="Requires client approval">
        ⚠ Pending approval
      </span>
    )
  }

  if (variant === 'modal') {
    return (
      <span className="approval-badge pending">
        ⚠ Pending Approval
      </span>
    )
  }

  return null
}

export default PhaseApprovalBadge
