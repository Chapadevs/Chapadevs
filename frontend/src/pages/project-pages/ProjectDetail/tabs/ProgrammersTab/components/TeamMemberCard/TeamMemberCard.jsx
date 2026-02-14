import { useNavigate } from 'react-router-dom'
import { Button, Tag } from '../../../../../../../components/ui-components'
import './TeamMemberCard.css'

const TeamMemberCard = ({
  member,
  role,
  status,
  isPrimary,
  isClientOwner,
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
    <div className="team-member-card" onClick={handleCardClick} style={{ cursor: 'pointer' }}>
      <div className="team-member-info">
        <div className="team-member-header">
          <h4 className="team-member-name">
            {member.name || member.email || (role === 'Client' ? 'Client' : 'Unknown Programmer')}
            <span className="team-member-role">{role}</span>
          </h4>
          <div className="team-member-status">
            {isPrimary && role === 'Programmer' && (
              <span className="team-member-status-badge status-assigned">Assigned</span>
            )}
            <span 
              className={`team-availability-badge ${status.status}`}
              style={{ color: status.color }}
            >
              {status.icon}
            </span>
            <span className="team-availability-text">{status.label}</span>
          </div>
        </div>
        {member.email && (
          <div className="team-member-detail">
            <strong>Email:</strong>
            <a 
              href={`mailto:${member.email}`} 
              className="team-member-email"
              onClick={(e) => e.stopPropagation()}
            >
              {member.email}
            </a>
          </div>
        )}
        {member.company && (
          <div className="team-member-detail">
            <strong>Company:</strong>
            <span>{member.company}</span>
          </div>
        )}
        {member.skills && member.skills.length > 0 && (
          <div className="team-member-detail">
            <strong>Skills:</strong>
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
            <strong>Bio:</strong>
            <p className="team-member-bio">{member.bio}</p>
          </div>
        )}
        {member.hourlyRate && (
          <div className="team-member-detail">
            <strong>Hourly Rate:</strong>
            <span className="team-member-rate">${member.hourlyRate}/hr</span>
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
    </div>
  )
}

export default TeamMemberCard
