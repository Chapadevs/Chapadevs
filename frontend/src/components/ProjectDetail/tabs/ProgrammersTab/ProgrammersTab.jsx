import TeamStatusBanner from './components/TeamStatusBanner/TeamStatusBanner'
import TeamMemberCard from './components/TeamMemberCard/TeamMemberCard'
import './ProgrammersTab.css'

const ProgrammersTab = ({ project, getUserStatus }) => {
  // Collect all programmers (primary + team members), avoiding duplicates
  const allProgrammers = []
  const seenIds = new Set()
  
  // Add primary assigned programmer if exists
  if (project.assignedProgrammerId) {
    const primaryId = (project.assignedProgrammerId._id || project.assignedProgrammerId)?.toString()
    if (primaryId) {
      seenIds.add(primaryId)
      allProgrammers.push({ ...project.assignedProgrammerId, isPrimary: true })
    }
  }
  
  // Add other programmers from assignedProgrammerIds array
  if (project.assignedProgrammerIds && Array.isArray(project.assignedProgrammerIds)) {
    project.assignedProgrammerIds.forEach((programmer) => {
      const programmerId = (programmer._id || programmer)?.toString()
      if (programmerId && !seenIds.has(programmerId)) {
        seenIds.add(programmerId)
        allProgrammers.push({ ...programmer, isPrimary: false })
      }
    })
  }

  return (
    <div className="project-tab-panel">
      <h3 className="project-tab-panel-title">Team</h3>
      
      <TeamStatusBanner project={project} />
      
      {/* Client Profile */}
      {project.clientId && (
        <TeamMemberCard
          member={project.clientId}
          role="Client"
          status={getUserStatus(project.clientId)}
          isPrimary={false}
        />
      )}

      {/* Programmer Profiles */}
      {allProgrammers.length === 0 ? (
        <div className="team-member-empty">
          <p>No programmer has been assigned to this project yet.</p>
          {project.status === 'Ready' && (
            <p className="team-member-empty-hint">
              This project is ready for assignment. Programmers can accept it from the Assignments page.
            </p>
          )}
        </div>
      ) : (
        allProgrammers.map((programmer, index) => (
          <TeamMemberCard
            key={index}
            member={programmer}
            role="Programmer"
            status={getUserStatus(programmer)}
            isPrimary={programmer.isPrimary}
          />
        ))
      )}
    </div>
  )
}

export default ProgrammersTab
