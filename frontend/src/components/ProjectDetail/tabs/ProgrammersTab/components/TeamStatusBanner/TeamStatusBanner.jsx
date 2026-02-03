import './TeamStatusBanner.css'

const TeamStatusBanner = ({ project }) => {
  if (project.status !== 'Ready') return null

  return (
    <div className={`team-status-banner ${project.teamClosed ? 'team-closed' : 'team-open'}`}>
      <span className="team-status-icon">{project.teamClosed ? '🔒' : '🔓'}</span>
      <span className="team-status-text">
        Team is {project.teamClosed ? 'Closed' : 'Open'} - {project.teamClosed ? 'No more programmers can join' : 'Programmers can still join'}
      </span>
    </div>
  )
}

export default TeamStatusBanner
