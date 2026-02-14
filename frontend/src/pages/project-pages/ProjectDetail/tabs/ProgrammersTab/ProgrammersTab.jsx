import TeamStatusBanner from './components/TeamStatusBanner/TeamStatusBanner'
import TeamMemberCard from './components/TeamMemberCard/TeamMemberCard'
import { SectionTitle } from '../../../../../components/ui-components'
import './ProgrammersTab.css'

const ProgrammersTab = ({
  project,
  getUserStatus,
  isClientOwner,
  onRemoveProgrammer,
  removingProgrammerId,
}) => {
  // Get the primary assigned programmer ID for comparison
  const primaryAssignedId = project.assignedProgrammerId 
    ? (project.assignedProgrammerId._id || project.assignedProgrammerId)?.toString()
    : null
  
  // Collect all programmers (primary + team members), avoiding duplicates
  const allProgrammers = []
  const seenIds = new Set()
  
  // Add primary assigned programmer if exists
  if (project.assignedProgrammerId && primaryAssignedId) {
    seenIds.add(primaryAssignedId)
    allProgrammers.push({ ...project.assignedProgrammerId, isPrimary: true })
  }
  
  // Add other programmers from assignedProgrammerIds array
  if (project.assignedProgrammerIds && Array.isArray(project.assignedProgrammerIds)) {
    project.assignedProgrammerIds.forEach((programmer) => {
      const programmerId = (programmer._id || programmer)?.toString()
      if (programmerId && !seenIds.has(programmerId)) {
        seenIds.add(programmerId)
        // Only mark as primary if this programmer's ID matches the assignedProgrammerId
        const isPrimary = primaryAssignedId && programmerId === primaryAssignedId
        allProgrammers.push({ ...programmer, isPrimary })
      }
    })
  }

  return (
    <div className="project-tab-panel">
      <div className="programmers-tab-header">
        <SectionTitle className="project-tab-panel-title mb-4">Team</SectionTitle>
      </div>
      
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
          {project.status === 'Open' && (
            <p className="team-member-empty-hint">
              This project is open for assignment. Programmers can join from the Assignments page.
            </p>
          )}
        </div>
      ) : (
        allProgrammers.map((programmer, index) => (
          <TeamMemberCard
            key={programmer._id || programmer.id || index}
            member={programmer}
            role="Programmer"
            status={getUserStatus(programmer)}
            isPrimary={programmer.isPrimary}
            isClientOwner={isClientOwner}
            onRemoveProgrammer={onRemoveProgrammer}
            removingProgrammerId={removingProgrammerId}
          />
        ))
      )}
    </div>
  )
}

export default ProgrammersTab
