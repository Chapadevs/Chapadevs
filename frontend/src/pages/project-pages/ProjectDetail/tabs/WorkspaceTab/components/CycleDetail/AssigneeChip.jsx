import { Link } from 'react-router-dom'
import { Avatar, AvatarImage, AvatarFallback } from '../../../../../../../components/ui-components'
import { getAvatarUrl } from '../../../../../../../utils/avatarUtils'

const AssigneeChip = ({ assignee }) => {
  if (!assignee) return null
  const assigneeId = assignee._id ?? assignee.id
  return (
    <div className="phase-current-assignee">
      <span className="phase-current-assignee-label">Assigned to:</span>
      <Link
        to={assigneeId ? `/users/${assigneeId}` : '#'}
        className="phase-current-assignee-link"
        onClick={(e) => e.stopPropagation()}
        aria-label={`View ${assignee.name}'s profile`}
      >
        <Avatar className="assignee-avatar">
          <AvatarImage src={getAvatarUrl(assignee.avatar)} alt={assignee.name} />
          <AvatarFallback>
            {assignee.name?.charAt(0)?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <span>{assignee.name}</span>
      </Link>
    </div>
  )
}

export default AssigneeChip
