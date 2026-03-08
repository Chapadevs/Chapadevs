import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { 
  Alert, 
  SidebarProvider, 
  SidebarInset, 
  Button,
  Badge
} from '../../../components/ui-components'
import { isProgrammer } from '../../../utils/roles'
import { projectAPI, assignmentAPI } from '../../../services/api'
import Header from '../../../components/layout-components/Header/Header'
import ProjectOverviewModal from '../../../components/modal-components/ProjectOverviewModal/ProjectOverviewModal'
import WorkspaceTab from './tabs/WorkspaceTab/Workspace'
import { useProjectData } from './hooks/useProjectData'
import { useUserStatuses } from './hooks/useUserStatuses'
import { useProjectNotifications } from './hooks/useProjectNotifications'
import { calculatePermissions } from './utils/userPermissionsUtils'
import ProjectSidebar from './components/ProjectSidebar/ProjectSidebar'
import OverviewTab from './tabs/OverviewTab/OverviewTab'
import AIPreviewTab from './tabs/AIPreviewTab/AIPreviewTab'
import ProgrammersTab from './tabs/ProgrammersTab/ProgrammersTab'
import CommentsTab from './tabs/CommentsTab/CommentsTab'
import ActivityTab from './tabs/ActivityTab/ActivityTab'
import CalendarTab from './tabs/CalendarTab/CalendarTab'
import AssetsTab from './tabs/AssetsTab/AssetsTab'

const MAX_PREVIEWS_PER_PROJECT = 3

function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  
  const {
    project,
    setProject,
    loading,
    error,
    setError,
    previews,
    previewsLoading,
    loadProject,
    loadPreviews,
  } = useProjectData()
  
  const { getUserStatus } = useUserStatuses(project)
  const {
    hasOverviewNotifications,
    hasAIPreviewNotifications,
    hasProgrammersNotifications,
    hasWorkspaceNotifications,
    hasActivityNotifications,
    hasCommentsNotifications,
    markTabAsRead,
    markProjectAsRead,
  } = useProjectNotifications(project)

  // When user opens this project, mark all its notifications as read once (clears list + sidebar badges)
  useEffect(() => {
    const projectId = project?._id || project?.id
    if (projectId) {
      markProjectAsRead()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when project id is set
  }, [project?._id ?? project?.id])

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    markTabAsRead(tabId)
  }

  // --- UI States for Actions ---
  const [markingReady, setMarkingReady] = useState(false)
  const [confirmingReady, setConfirmingReady] = useState(false)
  const [unconfirmingReady, setUnconfirmingReady] = useState(false)
  const [unmarkingReady, setUnmarkingReady] = useState(false)
  const [markingHolding, setMarkingHolding] = useState(false)
  const [togglingTeamClosed, setTogglingTeamClosed] = useState(false)
  const [startingDevelopment, setStartingDevelopment] = useState(false)
  const [stoppingDevelopment, setStoppingDevelopment] = useState(false)
  const [leavingProject, setLeavingProject] = useState(false)
  const [markingCompleted, setMarkingCompleted] = useState(false)
  const [markingCancelled, setMarkingCancelled] = useState(false)
  const [removingProgrammerId, setRemovingProgrammerId] = useState(null)
  const [activeTab, setActiveTab] = useState('timeline')
  const [overviewPreview, setOverviewPreview] = useState(null)
  const [overviewFetching, setOverviewFetching] = useState(false)
  const [overviewFetchAttempted, setOverviewFetchAttempted] = useState(false)

  // Merge API response with current project; preserve phases/previewCount when API omits them
  // (e.g. unmarkReady returns project without phases, which would hide the Workspace for client)
  const applyProjectUpdate = useCallback((updated, prev) => ({
    ...prev,
    ...updated,
    phases: updated.phases !== undefined ? updated.phases : prev?.phases,
    previewCount: updated.previewCount !== undefined ? updated.previewCount : prev?.previewCount,
  }), [])

  // --- Handlers ---
  const handleMarkReady = async () => {
    if (!window.confirm('Mark this project as Ready?')) return
    try {
      setMarkingReady(true); setError(null)
      const updatedProject = await projectAPI.markReady(id)
      setProject((prev) => applyProjectUpdate(updatedProject, prev))
    } catch (err) { setError(err.response?.data?.message || 'Failed to mark ready') }
    finally { setMarkingReady(false) }
  }

  const handleConfirmReady = async () => {
    if (!window.confirm("Confirm you're ready?")) return
    try {
      setConfirmingReady(true); setError(null)
      const updatedProject = await projectAPI.confirmReady(id)
      setProject((prev) => applyProjectUpdate(updatedProject, prev))
    } catch (err) { setError(err.response?.data?.message || "Failed to confirm ready") }
    finally { setConfirmingReady(false) }
  }

  const handleUnconfirmReady = async () => {
    if (!window.confirm('Revert to not ready?')) return
    try {
      setUnconfirmingReady(true); setError(null)
      const updatedProject = await projectAPI.unconfirmReady(id)
      setProject((prev) => applyProjectUpdate(updatedProject, prev))
    } catch (err) { setError(err.response?.data?.message || 'Failed to revert') }
    finally { setUnconfirmingReady(false) }
  }

  const handleUnmarkReady = async () => {
    if (!window.confirm('Revert to not ready? Programmers will need to confirm again.')) return
    try {
      setUnmarkingReady(true); setError(null)
      const updatedProject = await projectAPI.unmarkReady(id)
      setProject((prev) => applyProjectUpdate(updatedProject, prev))
    } catch (err) { setError(err.response?.data?.message || 'Failed to revert') }
    finally { setUnmarkingReady(false) }
  }

  const handleToggleTeamClosed = async () => {
    const newStatus = !project.teamClosed
    if (!window.confirm(newStatus ? 'Close Project?' : 'Open Project?')) return
    try {
      setTogglingTeamClosed(true); setError(null)
      const updatedProject = await projectAPI.toggleTeamClosed(id, newStatus)
      setProject((prev) => applyProjectUpdate(updatedProject, prev))
    } catch (err) { setError('Toggle failed') }
    finally { setTogglingTeamClosed(false) }
  }

  const handleStartDevelopment = async () => {
    if (!window.confirm('Start development?')) return
    try {
      setStartingDevelopment(true); setError(null)
      const updatedProject = await projectAPI.startDevelopment(id)
      setProject((prev) => applyProjectUpdate(updatedProject, prev))
    } catch (err) { setError('Failed to start development') }
    finally { setStartingDevelopment(false) }
  }

  const handleStopDevelopment = async () => {
    if (!window.confirm('Stop development?')) return
    try {
      setStoppingDevelopment(true); setError(null)
      const updatedProject = await projectAPI.stopDevelopment(id)
      setProject((prev) => applyProjectUpdate(updatedProject, prev))
    } catch (err) { setError('Failed to stop development') }
    finally { setStoppingDevelopment(false) }
  }

  const handleMarkHolding = async () => {
    if (!window.confirm('Set to On Hold?')) return
    try {
      setMarkingHolding(true); setError(null)
      const updatedProject = await projectAPI.markHolding(id)
      setProject((prev) => applyProjectUpdate(updatedProject, prev))
    } catch (err) { setError('Failed to set On Hold') }
    finally { setMarkingHolding(false) }
  }

  const handleMarkCompleted = async () => {
    if (!window.confirm('Mark this project as Completed?')) return
    try {
      setMarkingCompleted(true); setError(null)
      const updatedProject = await projectAPI.markCompleted(id)
      setProject((prev) => applyProjectUpdate(updatedProject, prev))
    } catch (err) { setError(err.response?.data?.message || 'Failed to mark completed') }
    finally { setMarkingCompleted(false) }
  }

  const handleCancelProject = async () => {
    if (!window.confirm('Cancel this project? This cannot be undone.')) return
    try {
      setMarkingCancelled(true); setError(null)
      const updatedProject = await projectAPI.markCancelled(id)
      setProject((prev) => applyProjectUpdate(updatedProject, prev))
    } catch (err) { setError(err.response?.data?.message || 'Failed to cancel project') }
    finally { setMarkingCancelled(false) }
  }

  const handleLeaveProject = async () => {
    if (!window.confirm('Leave project?')) return
    try {
      setLeavingProject(true); setError(null)
      await assignmentAPI.leave(id)
      navigate('/projects')
    } catch (err) { setError('Failed to leave'); setLeavingProject(false) }
  }

  const handleRemoveProgrammer = async (pId) => {
    if (!window.confirm('Remove programmer?')) return
    try {
      setRemovingProgrammerId(pId); setError(null)
      const updatedProject = await assignmentAPI.removeProgrammer(id, pId)
      setProject((prev) => applyProjectUpdate(updatedProject, prev))
    } catch (err) { setError('Failed to remove') }
    finally { setRemovingProgrammerId(null) }
  }

  const handleEditSave = async (payload) => {
    const updated = await projectAPI.update(id, payload)
    setProject((prev) => applyProjectUpdate(updated, prev))
    return updated
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this project?')) return
    try { await projectAPI.delete(id); navigate('/projects') }
    catch (err) { setError('Failed to delete') }
  }

  const handlePhaseUpdate = (updatedPhase) => {
    setProject((prev) => ({
      ...prev,
      phases: (prev.phases || []).map((p) =>
        (p._id || p.id) === (updatedPhase._id || updatedPhase.id) ? updatedPhase : p
      ),
    }))
    loadProject()
  }

  const handleProjectUpdate = (updatedProject) => {
    setProject((prev) => applyProjectUpdate(updatedProject, prev))
    loadProject()
  }

  // --- Effects & Auth ---
  const isNotAuthorized = error && typeof error === 'string' && error.toLowerCase().includes('not authorized')
  const hasOverviewFromState = location.state?.description != null || location.state?.title != null
  const isProgrammerUnauthorized = error && !project && isProgrammer(user) && isNotAuthorized
  const showOverviewModal = isProgrammerUnauthorized && (hasOverviewFromState || overviewPreview)

  useEffect(() => {
    if (isProgrammerUnauthorized && id && !hasOverviewFromState && !overviewPreview && !overviewFetchAttempted) {
      setOverviewFetchAttempted(true)
      setOverviewFetching(true)
      assignmentAPI.getProjectOverviewPublic(id)
        .then((data) => setOverviewPreview(data))
        .catch(() => {})
        .finally(() => setOverviewFetching(false))
    }
  }, [error, project, user, id, hasOverviewFromState, overviewPreview, overviewFetchAttempted, isNotAuthorized])

  if (loading) return <div className="flex h-screen items-center justify-center animate-pulse">Loading project...</div>

  if (error && !project) {
    if (showOverviewModal) {
      return (
      // Return a modal with the project overview when a programmer
      <>
          <Header />
          <div className="mx-auto max-w-7xl px-4 py-8">
             <ProjectOverviewModal 
               basicInfo={{ ...location.state, ...overviewPreview }} 
               onClose={() => navigate('/assignments')} 
             />
          </div>
        </>
      )
    }
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <Alert variant="error" className="mb-4">{error}</Alert>
        <button className="text-primary underline" onClick={() => navigate('/projects')}>← Back to Projects</button>
      </div>
    )
  }

  if (!project) return <div className="p-20 text-center">Project not found</div>

  const permissions = calculatePermissions(user, project)
  const showAIPreviewsSection = permissions.isClientOwner || permissions.isAssignedProgrammer
  const canGeneratePreviews = permissions.isClientOwner && previews.length < MAX_PREVIEWS_PER_PROJECT

  return (
    <SidebarProvider style={{ "--sidebar-width": "12rem", "--sidebar-width-icon": "2.5rem" }}>
      <div className="flex flex-col min-h-screen w-full bg-surface">
        <div className="flex flex-1 overflow-hidden">
          <ProjectSidebar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            showAIPreviewsSection={showAIPreviewsSection}
            hasOverviewNotifications={hasOverviewNotifications}
            hasAIPreviewNotifications={hasAIPreviewNotifications}
            hasProgrammersNotifications={hasProgrammersNotifications}
            hasWorkspaceNotifications={hasWorkspaceNotifications}
            hasActivityNotifications={hasActivityNotifications}
            hasCommentsNotifications={hasCommentsNotifications}
          />

          {/* Constrained width, centered content per design system */}
          <SidebarInset className="flex flex-col items-center p-4 md:p-6">
            <div className="w-full max-w-3xl mx-auto min-w-0">
              <div className="mb-6 flex flex-col items-center gap-2">
                <Badge variant={project.status?.toLowerCase() || 'default'} className="text-[10px] px-1.5 py-0 h-fit leading-none">
                  {project.status}
                </Badge>
                <h1 className="text-lg font-bold text-center">{project.title}</h1>
              </div>

              {error && <Alert variant="error" className="mb-6">{error}</Alert>}

              <section className="min-w-0 w-full pt-6">
                {activeTab === 'ai-preview' && showAIPreviewsSection && (
                  <AIPreviewTab
                    project={project}
                    previews={previews}
                    previewsLoading={previewsLoading}
                    isClientOwner={permissions.isClientOwner}
                    isAssignedProgrammer={permissions.isAssignedProgrammer}
                    canGeneratePreviews={canGeneratePreviews}
                    loadPreviews={loadPreviews}
                    setError={setError}
                  />
                )}
                {activeTab === 'programmers' && (
                  <ProgrammersTab
                    project={project}
                    getUserStatus={getUserStatus}
                    isClientOwner={permissions.isClientOwner}
                    onRemoveProgrammer={handleRemoveProgrammer}
                    removingProgrammerId={removingProgrammerId}
                  />
                )}
                {activeTab === 'timeline' && (
                  <WorkspaceTab 
                    project={project} 
                    previews={previews}
                    onPhaseUpdate={handlePhaseUpdate}
                    onWorkspaceConfirmed={loadProject}
                    onSwitchToPreviews={() => handleTabChange('ai-preview')}
                  />
                )}
                {activeTab === 'calendar' && (
                  <CalendarTab project={project} onPhaseUpdate={handlePhaseUpdate} />
                )}
                {activeTab === 'assets' && (
                  <AssetsTab
                    project={project}
                    canUploadAttachments={permissions.canUploadAttachments}
                    onPhaseUpdate={handlePhaseUpdate}
                    onProjectUpdate={handleProjectUpdate}
                  />
                )}
                {activeTab === 'activity' && (
                  <ActivityTab project={project} />
                )}
                {activeTab === 'overview' && (
                  <OverviewTab
                    project={project}
                    {...permissions}
                    onDelete={handleDelete}
                    onMarkReady={handleMarkReady}
                    onConfirmReady={handleConfirmReady}
                    onUnconfirmReady={handleUnconfirmReady}
                    onUnmarkReady={handleUnmarkReady}
                    onToggleTeamClosed={handleToggleTeamClosed}
                    onStartDevelopment={handleStartDevelopment}
                    onStopDevelopment={handleStopDevelopment}
                    onMarkHolding={handleMarkHolding}
                    onMarkCompleted={handleMarkCompleted}
                    onCancelProject={handleCancelProject}
                    onLeaveProject={handleLeaveProject}
                    onEditSave={handleEditSave}
                    markingReady={markingReady}
                    confirmingReady={confirmingReady}
                    unconfirmingReady={unconfirmingReady}
                    unmarkingReady={unmarkingReady}
                    togglingTeamClosed={togglingTeamClosed}
                    startingDevelopment={startingDevelopment}
                    stoppingDevelopment={stoppingDevelopment}
                    markingHolding={markingHolding}
                    markingCompleted={markingCompleted}
                    markingCancelled={markingCancelled}
                    leavingProject={leavingProject}
                  />
                )}
                {activeTab === 'comments' && <CommentsTab project={project} user={user} />}
              </section>
            </div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default ProjectDetail