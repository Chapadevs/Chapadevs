import TeamStatusBanner from './components/TeamStatusBanner/TeamStatusBanner'
import TeamMemberCard from './components/TeamMemberCard/TeamMemberCard'
import { SectionTitle } from '../../../../../components/ui-components'

const ProgrammersTab = ({
  project,
  getUserStatus,
  isClientOwner,
  onRemoveProgrammer,
  removingProgrammerId,
}) => {
  // Ready confirmed: set of programmer IDs who have confirmed "I'm ready"
  const readyConfirmedIds = new Set(
    (project.readyConfirmedBy || []).map((id) => (id?._id || id)?.toString()).filter(Boolean)
  )

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
    allProgrammers.push({
      ...project.assignedProgrammerId,
      isPrimary: true,
      isReady: readyConfirmedIds.has(primaryAssignedId),
    })
  }
  
  // Add other programmers from assignedProgrammerIds array
  if (project.assignedProgrammerIds && Array.isArray(project.assignedProgrammerIds)) {
    project.assignedProgrammerIds.forEach((programmer) => {
      const programmerId = (programmer._id || programmer)?.toString()
      if (programmerId && !seenIds.has(programmerId)) {
        seenIds.add(programmerId)
        const isPrimary = primaryAssignedId && programmerId === primaryAssignedId
        allProgrammers.push({
          ...programmer,
          isPrimary,
          isReady: readyConfirmedIds.has(programmerId),
        })
      }
    })
  }

  const teamCards = [
    ...(project.clientId
      ? [
          {
            key: 'client',
            member: project.clientId,
            role: 'Client',
            status: getUserStatus(project.clientId),
            isPrimary: false,
            isReady: project.clientMarkedReady === true,
            isClientOwner: false,
            onRemoveProgrammer: undefined,
            removingProgrammerId: undefined,
          },
        ]
      : []),
    ...allProgrammers.map((p, i) => ({
      key: p._id || p.id || i,
      member: p,
      role: 'Programmer',
      status: getUserStatus(p),
      isPrimary: p.isPrimary,
      isReady: p.isReady,
      isClientOwner,
      onRemoveProgrammer,
      removingProgrammerId,
    })),
  ]

  return (
    <div className="project-tab-panel">
      <SectionTitle className="mb-3">Team</SectionTitle>
      <TeamStatusBanner project={project} />
      {allProgrammers.length === 0 && !project.clientId ? (
        <div className="py-8 text-center">
          <p className="font-body text-ink-muted">No team members yet.</p>
          {project.status === 'Open' && (
            <p className="font-body text-xs text-ink-muted mt-1">
              Programmers can join from the Assignments page.
            </p>
          )}
        </div>
      ) : teamCards.length === 0 ? (
        <div className="py-8 text-center">
          <p className="font-body text-ink-muted">No programmer assigned yet.</p>
          {project.status === 'Open' && (
            <p className="font-body text-xs text-ink-muted mt-1">
              This project is open for assignment.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {teamCards.map((item) => (
            <TeamMemberCard
              key={item.key}
              member={item.member}
              role={item.role}
              status={item.status}
              isPrimary={item.isPrimary}
              isReady={item.isReady}
              isClientOwner={item.isClientOwner}
              onRemoveProgrammer={item.onRemoveProgrammer}
              removingProgrammerId={item.removingProgrammerId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default ProgrammersTab
