import { useState, useEffect } from 'react'
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
import ProjectSettingsModal from './components/ProjectSettingsModal/ProjectSettingsModal'
import WorkspaceTab from './tabs/WorkspaceTab/Workspace'
import { useProjectData } from './hooks/useProjectData'
import { useUserStatuses } from './hooks/useUserStatuses'
import { useProjectNotifications } from './hooks/useProjectNotifications'
import { calculatePermissions } from './utils/projectUtils'
import { getStatusBadgeClass } from './utils/projectUtils'
import ProjectSidebar from './components/ProjectSidebar/ProjectSidebar'
import SettingsTab from './tabs/SettingsTab/SettingsTab'
import AIPreviewTab from './tabs/AIPreviewTab/AIPreviewTab'
import ProgrammersTab from './tabs/ProgrammersTab/ProgrammersTab'
import CommentsTab from './tabs/CommentsTab/CommentsTab'

const MAX_PREVIEWS_PER_PROJECT = 10

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
    hasSettingsNotifications,
    hasAIPreviewNotifications,
    hasProgrammersNotifications,
    hasTimelineNotifications,
    hasCommentsNotifications,
  } = useProjectNotifications(project)

  // --- UI States for Actions ---
  const [markingReady, setMarkingReady] = useState(false)
  const [confirmingReady, setConfirmingReady] = useState(false)
  const [markingHolding, setMarkingHolding] = useState(false)
  const [togglingTeamClosed, setTogglingTeamClosed] = useState(false)
  const [startingDevelopment, setStartingDevelopment] = useState(false)
  const [stoppingDevelopment, setStoppingDevelopment] = useState(false)
  const [leavingProject, setLeavingProject] = useState(false)
  const [removingProgrammerId, setRemovingProgrammerId] = useState(null)
  const [activeTab, setActiveTab] = useState('ai-preview')
  const [settingsPreview, setSettingsPreview] = useState(null)
  const [settingsFetching, setSettingsFetching] = useState(false)
  const [settingsFetchAttempted, setSettingsFetchAttempted] = useState(false)

  // --- Handlers ---
  const handleMarkReady = async () => {
    if (!window.confirm('Mark this project as Ready?')) return
    try {
      setMarkingReady(true); setError(null)
      const updatedProject = await projectAPI.markReady(id)
      setProject(updatedProject)
    } catch (err) { setError(err.response?.data?.message || 'Failed to mark ready') }
    finally { setMarkingReady(false) }
  }

  const handleConfirmReady = async () => {
    if (!window.confirm("Confirm you're ready?")) return
    try {
      setConfirmingReady(true); setError(null)
      const updatedProject = await projectAPI.confirmReady(id)
      setProject(updatedProject)
    } catch (err) { setError(err.response?.data?.message || "Failed to confirm ready") }
    finally { setConfirmingReady(false) }
  }

  const handleToggleTeamClosed = async () => {
    const newStatus = !project.teamClosed
    if (!window.confirm(newStatus ? 'Close team?' : 'Open team?')) return
    try {
      setTogglingTeamClosed(true); setError(null)
      const updatedProject = await projectAPI.toggleTeamClosed(id, newStatus)
      setProject(updatedProject)
    } catch (err) { setError('Toggle failed') }
    finally { setTogglingTeamClosed(false) }
  }

  const handleStartDevelopment = async () => {
    if (!window.confirm('Start development?')) return
    try {
      setStartingDevelopment(true); setError(null)
      const updatedProject = await projectAPI.startDevelopment(id)
      setProject(updatedProject)
    } catch (err) { setError('Failed to start development') }
    finally { setStartingDevelopment(false) }
  }

  const handleStopDevelopment = async () => {
    if (!window.confirm('Stop development?')) return
    try {
      setStoppingDevelopment(true); setError(null)
      const updatedProject = await projectAPI.stopDevelopment(id)
      setProject(updatedProject)
    } catch (err) { setError('Failed to stop development') }
    finally { setStoppingDevelopment(false) }
  }

  const handleMarkHolding = async () => {
    if (!window.confirm('Set to On Hold?')) return
    try {
      setMarkingHolding(true); setError(null)
      const updatedProject = await projectAPI.markHolding(id)
      setProject(updatedProject)
    } catch (err) { setError('Failed to set On Hold') }
    finally { setMarkingHolding(false) }
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
      setProject(updatedProject)
    } catch (err) { setError('Failed to remove') }
    finally { setRemovingProgrammerId(null) }
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

  // --- Effects & Auth ---
  const isNotAuthorized = error && typeof error === 'string' && error.toLowerCase().includes('not authorized')
  const hasSettingsFromState = location.state?.description != null || location.state?.title != null
  const isProgrammerUnauthorized = error && !project && isProgrammer(user) && isNotAuthorized
  const showSettingsModal = isProgrammerUnauthorized && (hasSettingsFromState || settingsPreview)

  useEffect(() => {
    if (isProgrammerUnauthorized && id && !hasSettingsFromState && !settingsPreview && !settingsFetchAttempted) {
      setSettingsFetchAttempted(true)
      setSettingsFetching(true)
      assignmentAPI.getProjectSettingsPublic(id)
        .then((data) => setSettingsPreview(data))
        .catch(() => {})
        .finally(() => setSettingsFetching(false))
    }
  }, [error, project, user, id, hasSettingsFromState, settingsPreview, settingsFetchAttempted, isNotAuthorized])

  if (loading) return <div className="flex h-screen items-center justify-center animate-pulse">Loading project...</div>

  if (error && !project) {
    if (showSettingsModal) {
      return (
      // Return a modal with the project settings when a programmer
      <>
          <Header />
          <div className="mx-auto max-w-7xl px-4 py-8">
             <ProjectSettingsModal 
               basicInfo={{ ...location.state, ...settingsPreview }} 
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
    <SidebarProvider>
      <div className="flex flex-col min-h-screen w-full bg-surface">
        <div className="flex flex-1 overflow-hidden">
          <ProjectSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            showAIPreviewsSection={showAIPreviewsSection}
            hasSettingsNotifications={hasSettingsNotifications}
            hasAIPreviewNotifications={hasAIPreviewNotifications}
            hasProgrammersNotifications={hasProgrammersNotifications}
            hasTimelineNotifications={hasTimelineNotifications}
            hasCommentsNotifications={hasCommentsNotifications}
          />

          {/* Increased padding-top, reduced top proximity, fully center main content */}
          <SidebarInset className="flex-1 overflow-y-auto px-4 py-12 sm:px-8 lg:px-16">
            <div className="max-w-3xl mx-auto w-full flex flex-col min-h-[calc(100vh-112px)] justify-start">
              <div className="mb-12 flex items-center gap-4">
                {/* Mobile/collapsed back trigger button */}
                <Button 
                  to="/projects" 
                  variant="ghost" 
                  size="sm" 
                  className="w-fit text-ink-muted hover:text-ink pl-0"
                >
                  ← Back to Projects
                </Button>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">{project.title}</h1>
                  <Badge 
                    variant={project.status?.toLowerCase() || 'default'} 
                    className={getStatusBadgeClass(project.status)}
                  >
                    {project.status}
                  </Badge>
                </div>
              </div>

              {error && <Alert variant="error" className="mb-6">{error}</Alert>}

              <section>
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
                    onTimelineConfirmed={loadProject}
                  />
                )}
                {activeTab === 'settings' && (
                  <SettingsTab
                    project={project}
                    {...permissions} 
                    onDelete={handleDelete}
                    onMarkReady={handleMarkReady}
                    onConfirmReady={handleConfirmReady}
                    onToggleTeamClosed={handleToggleTeamClosed}
                    onStartDevelopment={handleStartDevelopment}
                    onStopDevelopment={handleStopDevelopment}
                    onMarkHolding={handleMarkHolding}
                    onLeaveProject={handleLeaveProject}
                    markingReady={markingReady}
                    confirmingReady={confirmingReady}
                    togglingTeamClosed={togglingTeamClosed}
                    startingDevelopment={startingDevelopment}
                    stoppingDevelopment={stoppingDevelopment}
                    markingHolding={markingHolding}
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