import { useNavigate } from 'react-router-dom'
import { Button, Card, Tag, Badge } from '../../../../../../../components/ui-components'
import './TeamMemberCard.css'

const TeamMemberCard = ({
  member,
  role,
  status,
  isPrimary,
  isClientOwner,
  isReady,
  onRemoveProgrammer,
  removingProgrammerId,
}) => {
  const navigate = useNavigate()
  const memberId = (member._id || member)?.toString?.() || member._id || member

  const handleCardClick = (e) => {
    if (e.target.tagName === 'A' || e.target.closest('a') || e.target.closest('button')) {
      return
    }
    if (memberId) {
      navigate(`/users/${memberId}`)
    }
  }

  const handleRemoveClick = (e) => {
    e.stopPropagation()
    if (onRemoveProgrammer && memberId) onRemoveProgrammer(memberId)
  }

  const isRemoving = removingProgrammerId && (removingProgrammerId.toString() === memberId.toString())
  const showRemoveButton = role === 'Programmer' && isClientOwner && onRemoveProgrammer

  return (
    <Card variant="default" className="team-member-card" onClick={handleCardClick} style={{ cursor: 'pointer' }}>
      <div className="team-member-info">
        <div className="team-member-header">
          <h4 className="team-member-name font-heading text-sm uppercase tracking-wider">
            {member.name || member.email || (role === 'Client' ? 'Client' : 'Unknown Programmer')}
            <span className="team-member-role font-body text-ink-muted font-normal normal-case text-xs">{role}</span>
          </h4>
          <div className="team-member-status flex items-center gap-2">
            {isPrimary && role === 'Programmer' && (
              <Badge variant="programmer" className="team-member-status-badge status-assigned rounded-none font-button text-xs">Assigned</Badge>
            )}
            <span 
              className={`team-availability-badge ${status.status}`}
              style={{ color: status.color }}
              aria-hidden
            >
              {status.icon}
            </span>
            <span className="team-availability-text font-body text-sm text-ink-muted">{status.label}</span>
          </div>
        </div>
        {role === 'Programmer' && isReady !== undefined && (
          <div className="team-member-detail">
            <span className="font-body text-sm">
              {isReady ? (
                <Badge variant="success" className="rounded-none font-button text-xs">Ready</Badge>
              ) : (
                <Badge variant="default" className="rounded-none font-button text-xs">Not ready</Badge>
              )}
            </span>
          </div>
        )}
        {member.email && (
          <div className="team-member-detail">
            <strong className="font-heading text-xs uppercase text-ink-muted">Email</strong>
            <a 
              href={`mailto:${member.email}`} 
              className="team-member-email font-body text-sm text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {member.email}
            </a>
          </div>
        )}
        {member.company && (
          <div className="team-member-detail">
            <strong className="font-heading text-xs uppercase text-ink-muted">Company</strong>
            <span className="font-body text-sm">{member.company}</span>
          </div>
        )}
        {member.skills && member.skills.length > 0 && (
          <div className="team-member-detail">
            <strong className="font-heading text-xs uppercase text-ink-muted">Skills</strong>
            <div className="team-member-skills">
              {member.skills.map((skill, skillIndex) => (
                <Tag key={skillIndex} variant="skill" className="team-member-skill-tag">
                  {skill}
                </Tag>
              ))}
            </div>
          </div>
        )}
        {member.bio && (
          <div className="team-member-detail">
            <strong className="font-heading text-xs uppercase text-ink-muted">Bio</strong>
            <p className="team-member-bio font-body text-sm">{member.bio}</p>
          </div>
        )}
        {member.hourlyRate && (
          <div className="team-member-detail">
            <strong className="font-heading text-xs uppercase text-ink-muted">Hourly rate</strong>
            <span className="team-member-rate font-body text-sm">${member.hourlyRate}/hr</span>
          </div>
        )}
        {showRemoveButton && (
          <div className="team-member-actions">
            <Button
              type="button"
              variant="danger"
              size="sm"
              className="team-member-remove-btn"
              onClick={handleRemoveClick}
              disabled={isRemoving}
            >
              {isRemoving ? 'Removing...' : 'Remove from project'}
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}

export default TeamMemberCard
