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
  const canEdit = (user?.role === 'client' || user?.role === 'user') && isClientOwner && ['Holding', 'Ready'].includes(project.status)
  const canDelete = (user?.role === 'client' || user?.role === 'user') && isClientOwner && ['Holding', 'Development'].includes(project.status)
  const canMarkReady = (user?.role === 'client' || user?.role === 'user') && isClientOwner && project.status === 'Holding'
  const canToggleTeamClosed = (user?.role === 'client' || user?.role === 'user' || user?.role === 'admin') && isClientOwner && project.status === 'Ready'

  return {
    isClientOwner,
    isAssignedProgrammer,
    canEdit,
    canDelete,
    canMarkReady,
    canToggleTeamClosed,
  }
}
