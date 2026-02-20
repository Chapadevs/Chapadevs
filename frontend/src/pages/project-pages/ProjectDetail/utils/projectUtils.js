import { isAdmin } from '../../../../utils/roles'

export const getStatusBadgeClass = (status) => {
  const statusMap = {
    'Holding': 'status-holding',
    'Open': 'status-open',
    'Ready': 'status-ready',
    'Development': 'status-development',
    'Completed': 'status-completed',
    'Cancelled': 'status-cancelled',
  }
  return statusMap[status] || 'status-default'
}

export const calculatePermissions = (user, project) => {
  const userIdStr = (user?._id || user?.id)?.toString()
  const clientIdStr = (project.clientId?._id || project.clientId)?.toString()
  const assignedProgrammerIdStr = (project.assignedProgrammerId?._id || project.assignedProgrammerId)?.toString()
  const isClientOwner = userIdStr && clientIdStr && clientIdStr === userIdStr
  const isAssignedProgrammer = userIdStr && assignedProgrammerIdStr && assignedProgrammerIdStr === userIdStr

  // Check if user is in the assignedProgrammerIds array
  const isInTeam = project.assignedProgrammerIds && Array.isArray(project.assignedProgrammerIds) &&
    project.assignedProgrammerIds.some(programmer => {
      const programmerId = (programmer._id || programmer)?.toString()
      return programmerId === userIdStr
    })

  const admin = isAdmin(user)
  const isProgrammerInProject = (user?.role === 'programmer' || user?.role === 'admin') &&
    (isAssignedProgrammer || isInTeam)

  const hasProgrammers = project.assignedProgrammerId ||
    (project.assignedProgrammerIds && project.assignedProgrammerIds.length > 0)
  const isOpen = project.status === 'Open'
  const isReadyForDev = project.status === 'Ready'

  // All team members must have confirmed ready before client can mark project ready
  const teamIds = new Set()
  if (project.assignedProgrammerId) {
    teamIds.add((project.assignedProgrammerId?._id || project.assignedProgrammerId)?.toString())
  }
  ;(project.assignedProgrammerIds || []).forEach((p) => {
    teamIds.add((p?._id || p)?.toString())
  })
  const confirmedIds = new Set((project.readyConfirmedBy || []).map((id) => (id?._id || id)?.toString()))
  const allTeamConfirmedReady = teamIds.size > 0 && [...teamIds].every((id) => id && confirmedIds.has(id))
  const hasUserConfirmedReady = userIdStr && confirmedIds.has(userIdStr)

  const canEdit = (user?.role === 'client' || user?.role === 'user') && isClientOwner && ['Holding', 'Open', 'Ready'].includes(project.status)
  const canDelete = (user?.role === 'client' || user?.role === 'user') && isClientOwner && ['Holding', 'Open', 'Ready', 'Development'].includes(project.status)


  // Open/Close team: Holding (show Open) or Open (show Close)
  const canToggleTeamClosed = (user?.role === 'client' || user?.role === 'user' || user?.role === 'admin') &&
    isClientOwner &&
    (project.status === 'Holding' || project.status === 'Open')
  // Mark Ready: client, when Open + has programmers (disabled until all team confirmed)
  const canMarkReady = (user?.role === 'client' || user?.role === 'user' || user?.role === 'admin') &&
    isClientOwner &&
    isOpen &&
    hasProgrammers
  // Show Mark Ready button when Holding or Open (before development) so flow is visible; disabled when Holding
  const showMarkReady = (user?.role === 'client' || user?.role === 'user' || user?.role === 'admin') &&
    isClientOwner &&
    (project.status === 'Holding' || project.status === 'Open')
  // Confirm ready: programmer in team, project Open, not yet confirmed
  const canConfirmReady = isProgrammerInProject && isOpen && !project.teamClosed && !hasUserConfirmedReady
  // Show I'm Ready button when Holding or Open so flow is visible; disabled when Holding or team closed
  const showConfirmReady = isProgrammerInProject &&
    (project.status === 'Holding' || project.status === 'Open')

  // Start Development: programmer, when Ready + team closed (clickable only when Ready)
  const canStartDevelopment = (user?.role === 'programmer' || user?.role === 'admin') &&
    isProgrammerInProject &&
    isReadyForDev
  // Show Start Development for programmer when Open or Ready (disabled when Open — "everyone should be ready")
  const showStartDevelopment = (user?.role === 'programmer' || user?.role === 'admin') &&
    isProgrammerInProject &&
    (project.status === 'Open' || project.status === 'Ready')
  // Stop Development: client or programmer in project, when Development
  const canStopDevelopment = project.status === 'Development' &&
    (isClientOwner || isProgrammerInProject || admin)
  // Set to On Hold: client, when Ready (return to Holding)
  const canSetToHolding = (user?.role === 'client' || user?.role === 'user' || user?.role === 'admin') &&
    isClientOwner &&
    project.status === 'Ready'

  // Mark as Completed: client or programmer in project, when Development
  const canMarkCompleted = project.status === 'Development' &&
    (isClientOwner || isProgrammerInProject || admin)
  // Cancel project: client or admin, when not Completed and not already Cancelled
  const canCancel = (isClientOwner || admin) &&
    project.status !== 'Completed' &&
    project.status !== 'Cancelled'

  // Phase/timeline permissions: any programmer in project (single assignee or team) or admin
  const canConfirmTimeline = isAssignedProgrammer || isInTeam || admin
  const canChangePhaseStatus = isAssignedProgrammer || isInTeam || admin
  const canUpdateSubSteps = isAssignedProgrammer || isInTeam || admin
  const canSaveNotes = isAssignedProgrammer || isInTeam || admin
  const canAnswerQuestion = isClientOwner || admin
  const canUploadAttachments = isAssignedProgrammer || isInTeam || isClientOwner || admin
  const isProgrammerOrAdmin = isAssignedProgrammer || admin

  return {
    isClientOwner,
    isAssignedProgrammer,
    isProgrammerInProject,
    canEdit,
    canDelete,
    canMarkReady,
    canConfirmReady,
    showMarkReady,
    showConfirmReady,
    allTeamConfirmedReady,
    canToggleTeamClosed,
    canStartDevelopment,
    showStartDevelopment,
    canStopDevelopment,
    canSetToHolding,
    canMarkCompleted,
    canCancel,
    canConfirmTimeline,
    canChangePhaseStatus,
    canUpdateSubSteps,
    canSaveNotes,
    canAnswerQuestion,
    canUploadAttachments,
    isProgrammerOrAdmin,
  }
}
