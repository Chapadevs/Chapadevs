import './TeamStatusBanner.css'

const TeamStatusBanner = ({ project }) => {
  if (project.status !== 'Open' && project.status !== 'Ready') return null

  const isOpen = project.status === 'Open'
  const teamIds = new Set()
  if (project.assignedProgrammerId) {
    teamIds.add((project.assignedProgrammerId?._id || project.assignedProgrammerId)?.toString())
  }
  ;(project.assignedProgrammerIds || []).forEach((p) => {
    teamIds.add((p?._id || p)?.toString())
  })
  const confirmedIds = new Set((project.readyConfirmedBy || []).map((id) => (id?._id || id)?.toString()))
  const confirmedCount = [...teamIds].filter((id) => id && confirmedIds.has(id)).length
  const teamCount = teamIds.size

  let statusText
  if (isOpen) {
    statusText = teamCount > 0
      ? `Team is Open - ${confirmedCount} of ${teamCount} programmer${teamCount !== 1 ? 's' : ''} ready`
      : 'Team is Open - Programmers can still join'
  } else {
    statusText = 'Team is Closed - Ready for development'
  }

  return (
    <div className={`team-status-banner ${isOpen ? 'team-open' : 'team-closed'}`}>
      <span className="team-status-text">{statusText}</span>
    </div>
  )
}

export default TeamStatusBanner
