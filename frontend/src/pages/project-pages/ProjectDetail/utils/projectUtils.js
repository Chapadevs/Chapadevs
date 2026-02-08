import { isAdmin } from '../../../../config/roles'

export const getStatusBadgeClass = (status) => {
  const statusMap = {
    'Holding': 'status-holding',
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

  const canEdit = (user?.role === 'client' || user?.role === 'user') && isClientOwner && ['Holding', 'Ready'].includes(project.status)
  const canDelete = (user?.role === 'client' || user?.role === 'user') && isClientOwner && ['Holding', 'Ready', 'Development'].includes(project.status)
  const canMarkReady = (user?.role === 'client' || user?.role === 'user') && isClientOwner && project.status === 'Holding'
  // Allow toggling team closed/open when status is Ready or Development (if team is closed, status will be Development)
  const canToggleTeamClosed = (user?.role === 'client' || user?.role === 'user' || user?.role === 'admin') &&
    isClientOwner &&
    (project.status === 'Ready' || (project.status === 'Development' && project.teamClosed))

  // Phase/timeline permissions (programmer or admin)
  const canChangePhaseStatus = isAssignedProgrammer || admin
  const canUpdateSubSteps = isAssignedProgrammer || admin
  const canSaveNotes = isAssignedProgrammer || admin
  const canAnswerQuestion = isClientOwner || admin
  const canUploadAttachments = isAssignedProgrammer || isClientOwner || admin
  const isProgrammerOrAdmin = isAssignedProgrammer || admin

  return {
    isClientOwner,
    isAssignedProgrammer,
    isProgrammerInProject,
    canEdit,
    canDelete,
    canMarkReady,
    canToggleTeamClosed,
    canChangePhaseStatus,
    canUpdateSubSteps,
    canSaveNotes,
    canAnswerQuestion,
    canUploadAttachments,
    isProgrammerOrAdmin,
  }
}
