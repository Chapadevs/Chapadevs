import { isAdmin } from '../../../../utils/roles'

/**
 * Checks if all project phases/cycles and requirements are complete so the project can be marked as Completed.
 * Returns { ready: boolean, reason?: string }.
 */
export function isProjectReadyForCompletion(project) {
  const phases = project?.phases || []
  if (phases.length === 0) {
    return { ready: false, reason: 'Complete all project phases first' }
  }

  for (const phase of phases) {
    // Phase must be completed
    if (phase.status !== 'completed') {
      return { ready: false, reason: `Complete phase "${phase.title || 'Untitled'}" before marking the project as completed` }
    }
    // If phase requires client approval, it must be approved
    if (phase.requiresClientApproval && !phase.clientApproved) {
      return { ready: false, reason: `Phase "${phase.title || 'Untitled'}" requires client approval before completion` }
    }
    // All sub-steps must be completed
    const subSteps = phase.subSteps || []
    for (const subStep of subSteps) {
      const isCompleted = subStep.status === 'completed' || subStep.completed === true
      if (!isCompleted) {
        return { ready: false, reason: `Complete all sub-steps in phase "${phase.title || 'Untitled'}" before marking the project as completed` }
      }
    }
    // All required attachments (phase-level) must be received
    const phaseRequired = phase.requiredAttachments || []
    const missingPhaseAttachments = phaseRequired.filter((ra) => !ra.receivedAt)
    if (missingPhaseAttachments.length > 0) {
      return { ready: false, reason: `Provide all required attachments for phase "${phase.title || 'Untitled'}" before marking the project as completed` }
    }
    // All required attachments (sub-step level) must be received
    for (const subStep of subSteps) {
      const subRequired = subStep.requiredAttachments || []
      const missingSubAttachments = subRequired.filter((ra) => !ra.receivedAt)
      if (missingSubAttachments.length > 0) {
        return { ready: false, reason: `Provide all required attachments for sub-steps in phase "${phase.title || 'Untitled'}" before marking the project as completed` }
      }
    }
  }

  return { ready: true }
}

/**
 * Checks if a single phase/cycle is ready to be marked as completed.
 * Returns { ready: boolean, reason?: string }.
 */
export function isPhaseReadyForCompletion(phase) {
  if (!phase) {
    return { ready: false, reason: 'Phase not found' }
  }

  if (phase.requiresClientApproval && !phase.clientApproved) {
    return { ready: false, reason: `Client approval required before marking complete` }
  }

  const subSteps = phase.subSteps || []
  for (const subStep of subSteps) {
    const isCompleted = subStep.status === 'completed' || subStep.completed === true
    if (!isCompleted) {
      return { ready: false, reason: `Complete all sub-steps before marking complete` }
    }
  }

  const phaseRequired = phase.requiredAttachments || []
  const missingPhaseAttachments = phaseRequired.filter((ra) => !ra.receivedAt)
  if (missingPhaseAttachments.length > 0) {
    return { ready: false, reason: `Provide all required attachments for this phase before marking complete` }
  }

  for (const subStep of subSteps) {
    const subRequired = subStep.requiredAttachments || []
    const missingSubAttachments = subRequired.filter((ra) => !ra.receivedAt)
    if (missingSubAttachments.length > 0) {
      return { ready: false, reason: `Provide all required attachments for sub-steps before marking complete` }
    }
  }

  // Client questions requirement removed for now

  return { ready: true }
}

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

  const isOpen = project.status === 'Open'
  const isReadyForDev = project.status === 'Ready'

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


  // Open/Close Project: Holding (show Open) or Open (show Close)
  const canToggleTeamClosed = (user?.role === 'client' || user?.role === 'user' || user?.role === 'admin') &&
    isClientOwner &&
    (project.status === 'Holding' || project.status === 'Open')
  // Client marks ready first (I've reviewed); then programmers can create steps and confirm ready.
  // Client can mark ready even with no programmers yet, so when one joins they can create phases straight away.
  const clientMarkedReady = project.clientMarkedReady === true
  const canMarkReady = (user?.role === 'client' || user?.role === 'user' || user?.role === 'admin') &&
    isClientOwner &&
    isOpen &&
    !clientMarkedReady
  const showMarkReady = (user?.role === 'client' || user?.role === 'user' || user?.role === 'admin') &&
    isClientOwner &&
    isOpen &&
    !clientMarkedReady
  // Programmer can confirm ready only after client has marked ready AND workspace (phases) has been created
  const hasPhases = project?.phases && project.phases.length > 0
  const canConfirmReady = isProgrammerInProject && isOpen && !project.teamClosed && !hasUserConfirmedReady && clientMarkedReady && hasPhases
  const showConfirmReady = isProgrammerInProject && isOpen
  const canUnconfirmReady = isProgrammerInProject && (isOpen || project.status === 'Ready') && hasUserConfirmedReady
  const canUnmarkReady = (user?.role === 'client' || user?.role === 'user' || user?.role === 'admin') &&
    isClientOwner &&
    (isOpen || project.status === 'Ready') &&
    clientMarkedReady
  // Programmer can create steps (Workspace) only after client has marked ready
  const canCreateSteps = (isAssignedProgrammer || isInTeam || admin) && isOpen && clientMarkedReady

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
  // Button is locked until ALL phases/cycles and requirements are done (see isProjectReadyForCompletion)
  const hasMarkCompletedPermission = project.status === 'Development' &&
    (isClientOwner || isProgrammerInProject || admin)
  const completionReadiness = isProjectReadyForCompletion(project)
  const canMarkCompleted = hasMarkCompletedPermission && completionReadiness.ready
  const markCompletedBlockedReason = hasMarkCompletedPermission && !completionReadiness.ready ? completionReadiness.reason : null
  // Cancel project: client or admin, when not Completed and not already Cancelled
  const canCancel = (isClientOwner || admin) &&
    project.status !== 'Completed' &&
    project.status !== 'Cancelled'

  // Phase/timeline permissions: any programmer in project (single assignee or team) or admin
  const canConfirmWorkspace = isAssignedProgrammer || isInTeam || admin
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
    canUnconfirmReady,
    canUnmarkReady,
    allTeamConfirmedReady,
    canToggleTeamClosed,
    canStartDevelopment,
    showStartDevelopment,
    canStopDevelopment,
    canSetToHolding,
    canMarkCompleted,
    showMarkCompleted: hasMarkCompletedPermission,
    markCompletedBlockedReason,
    canCancel,
    canConfirmWorkspace,
    canCreateSteps,
    canChangePhaseStatus,
    canUpdateSubSteps,
    canSaveNotes,
    canAnswerQuestion,
    canUploadAttachments,
    isProgrammerOrAdmin,
  }
}
