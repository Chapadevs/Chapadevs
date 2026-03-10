import { useNavigate } from 'react-router-dom'
import { Button, Card, Badge, Avatar, AvatarImage, AvatarFallback } from '../../../../../../../components/ui-components'
import { cn } from '@/utils/shadcn'

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
  const displayName = member.name || member.email || (role === 'Client' ? 'Client' : 'Unknown Programmer')
  const nameOrEmail = member.name || member.email || '?'
  const initials = member.name
    ? nameOrEmail.split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase()
    : (nameOrEmail[0] || '?').toUpperCase()

  const handleCardClick = (e) => {
    if (e.target.tagName === 'A' || e.target.closest('a') || e.target.closest('button')) return
    if (memberId) navigate(`/users/${memberId}`)
  }

  const handleRemoveClick = (e) => {
    e.stopPropagation()
    if (onRemoveProgrammer && memberId) onRemoveProgrammer(memberId)
  }

  const isRemoving = removingProgrammerId && (removingProgrammerId.toString() === memberId.toString())
  const showRemoveButton = role === 'Programmer' && isClientOwner && onRemoveProgrammer

  return (
    <Card
      className={cn(
        'p-3 transition-colors hover:border-primary hover:shadow-sm cursor-pointer',
        'flex flex-col sm:flex-row sm:items-center gap-3 min-w-0'
      )}
      onClick={handleCardClick}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={member.avatar} alt="" />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-heading text-xs uppercase tracking-wider text-ink truncate">
              {displayName}
            </h4>
            <span className="font-body text-xs text-ink-muted normal-case shrink-0">{role}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span
              className="inline-flex items-center gap-1 font-body text-xs text-ink-muted"
              aria-hidden
            >
              <span style={{ color: status.color }}>{status.icon}</span>
              {status.label}
            </span>
            {isReady !== undefined && (
              <>
                <span className="text-ink-muted">·</span>
                {isReady ? (
                  <Badge variant="success" className="rounded-none font-button text-[10px] px-1.5 py-0">
                    Ready
                  </Badge>
                ) : (
                  <Badge variant="default" className="rounded-none font-button text-[10px] px-1.5 py-0">
                    Not ready
                  </Badge>
                )}
              </>
            )}
          </div>
          {member.email && (
            <a
              href={`mailto:${member.email}`}
              className="font-body text-xs text-primary hover:underline truncate block mt-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              {member.email}
            </a>
          )}
        </div>
      </div>
      {showRemoveButton && (
        <div className="shrink-0 sm:border-l sm:border-border sm:pl-3">
          <Button
            type="button"
            variant="danger"
            size="xs"
            onClick={handleRemoveClick}
            disabled={isRemoving}
          >
            {isRemoving ? 'Removing...' : 'Remove'}
          </Button>
        </div>
      )}
    </Card>
  )
}

export default TeamMemberCard
