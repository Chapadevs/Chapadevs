import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { Alert, Button, SecondaryButton } from '../../../components/ui-components'
import { isProgrammer } from '../../../utils/roles'
import { projectAPI, assignmentAPI } from '../../../services/api'
import Header from '../../../components/layout-components/Header/Header'
import ProjectSettingsModal from './components/ProjectSettingsModal/ProjectSettingsModal'
import WorkspaceTab from './tabs/WorkspaceTab/Workspace'
import { useProjectData } from './hooks/useProjectData'
import { useUserStatuses } from './hooks/useUserStatuses'
import { useProjectNotifications } from './hooks/useProjectNotifications'
import { calculatePermissions } from './utils/projectUtils'
import ProjectHeader from './components/ProjectHeader/ProjectHeader'
import ProjectSidebar from './components/ProjectSidebar/ProjectSidebar'
import SettingsTab from './tabs/SettingsTab/SettingsTab'
import AIPreviewTab from './tabs/AIPreviewTab/AIPreviewTab'
import ProgrammersTab from './tabs/ProgrammersTab/ProgrammersTab'
import CommentsTab from './tabs/CommentsTab/CommentsTab'

const MAX_PREVIEWS_PER_PROJECT = 5

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
  const [activeTab, setActiveTab] = useState('settings')
  const [settingsPreview, setSettingsPreview] = useState(null)
  const [settingsFetching, setSettingsFetching] = useState(false)
  const [settingsFetchAttempted, setSettingsFetchAttempted] = useState(false)

  // --- Restoration of Handler Logic ---

  const handleMarkReady = async () => {
    if (!window.confirm('Mark this project as Ready? This will close the team and allow programmers to start development.')) return
    try {
      setMarkingReady(true); setError(null)
      const updatedProject = await projectAPI.markReady(id)
      setProject(updatedProject)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to mark ready')
    } finally { setMarkingReady(false) }
  }

  const handleConfirmReady = async () => {
    if (!window.confirm("Confirm you're ready to start development?")) return
    try {
      setConfirmingReady(true); setError(null)
      const updatedProject = await projectAPI.confirmReady(id)
      setProject(updatedProject)
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to confirm ready")
    } finally { setConfirmingReady(false) }
  }

  const handleToggleTeamClosed = async () => {
    const newStatus = !project.teamClosed
    if (!window.confirm(newStatus ? 'Close team?' : 'Open team?')) return
    try {
      setTogglingTeamClosed(true); setError(null)
      const updatedProject = await projectAPI.toggleTeamClosed(id, newStatus)
      setProject(updatedProject)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Toggle failed')
    } finally { setTogglingTeamClosed(false) }
  }

  const handleStartDevelopment = async () => {
    if (!window.confirm('Start development?')) return
    try {
      setStartingDevelopment(true); setError(null)
      const updatedProject = await projectAPI.startDevelopment(id)
      setProject(updatedProject)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to start development')
    } finally { setStartingDevelopment(false) }
  }

  const handleStopDevelopment = async () => {
    if (!window.confirm('Stop development and return to Ready?')) return
    try {
      setStoppingDevelopment(true); setError(null)
      const updatedProject = await projectAPI.stopDevelopment(id)
      setProject(updatedProject)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to stop development')
    } finally { setStoppingDevelopment(false) }
  }

  const handleMarkHolding = async () => {
    if (!window.confirm('Set to On Hold?')) return
    try {
      setMarkingHolding(true); setError(null)
      const updatedProject = await projectAPI.markHolding(id)
      setProject(updatedProject)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to set On Hold')
    } finally { setMarkingHolding(false) }
  }

  const handleLeaveProject = async () => {
    if (!window.confirm('Leave project?')) return
    try {
      setLeavingProject(true); setError(null)
      await assignmentAPI.leave(id)
      navigate('/projects')
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to leave')
      setLeavingProject(false)
    }
  }

  const handleRemoveProgrammer = async (programmerId) => {
    if (!window.confirm('Remove programmer?')) return
    try {
      setRemovingProgrammerId(programmerId); setError(null)
      const updatedProject = await assignmentAPI.removeProgrammer(id, programmerId)
      setProject(updatedProject)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to remove')
    } finally { setRemovingProgrammerId(null) }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this project?')) return
    try {
      await projectAPI.delete(id)
      navigate('/projects')
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete')
    }
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

  // --- Effects & Unauthorized Handling ---
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

  const handleSettingsModalClose = () => {
    setSettingsPreview(null)
    navigate('/assignments')
  }

  if (loading) return <div className="flex h-screen items-center justify-center text-ink-muted animate-pulse">Loading project...</div>

  if (error && !project) {
    if (showSettingsModal) {
      return (
        <>
          <Header />
          <div className="mx-auto max-w-7xl px-4 py-8">
             <ProjectSettingsModal 
               basicInfo={{ ...location.state, ...settingsPreview }} 
               onClose={handleSettingsModalClose} 
             />
          </div>
        </>
      )
    }
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <Alert variant="error" className="mb-4">{error}</Alert>
        <SecondaryButton onClick={() => navigate('/projects')}>← Back to Projects</SecondaryButton>
      </div>
    )
  }

  if (!project) return <div className="p-20 text-center text-ink-muted">Project not found</div>

  const permissions = calculatePermissions(user, project)
  const showAIPreviewsSection = permissions.isClientOwner || permissions.isAssignedProgrammer
  const canGeneratePreviews = permissions.isClientOwner && previews.length < MAX_PREVIEWS_PER_PROJECT

  return (
    <div className="min-h-screen bg-surface">
      <Header />
      
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header with Shadcn-like spacing */}
        <div className="mb-10">
          <ProjectHeader 
            project={project} 
            isClientOwner={permissions.isClientOwner}
            onDelete={handleDelete}
            markingReady={markingReady}
            onMarkReady={handleMarkReady}
            canMarkReady={permissions.canMarkReady}
            allTeamConfirmedReady={permissions.allTeamConfirmedReady}
            canConfirmReady={permissions.canConfirmReady}
            confirmingReady={confirmingReady}
            onConfirmReady={handleConfirmReady}
            canToggleTeamClosed={permissions.canToggleTeamClosed}
            togglingTeamClosed={togglingTeamClosed}
            onToggleTeamClosed={handleToggleTeamClosed}
            canStartDevelopment={permissions.canStartDevelopment}
            startingDevelopment={startingDevelopment}
            onStartDevelopment={handleStartDevelopment}
            canStopDevelopment={permissions.canStopDevelopment}
            stoppingDevelopment={stoppingDevelopment}
            onStopDevelopment={handleStopDevelopment}
            canSetToHolding={permissions.canSetToHolding}
            markingHolding={markingHolding}
            onMarkHolding={handleMarkHolding}
            isProgrammerInProject={permissions.isProgrammerInProject}
            leavingProject={leavingProject}
            onLeaveProject={handleLeaveProject}
          />
        </div>

        {error && <Alert variant="error" className="mb-6">{error}</Alert>}

        {/* The Sidebar & Content Grid */}
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
          
          {/* Sidebar Area */}
          <aside className="w-full shrink-0 lg:w-64">
            <div className="sticky top-24">
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
            </div>
          </aside>

          {/* Main Content Area */}
          <section className="flex-1 min-w-0 bg-white border border-border rounded-xl shadow-sm p-8 min-h-[600px]">
          {activeTab === 'settings' && (
              <SettingsTab
                project={project}
                // Pass all permission flags from the calculatePermissions hook
                {...permissions} 
                // Pass handler functions
                onDelete={handleDelete}
                onMarkReady={handleMarkReady}
                onConfirmReady={handleConfirmReady}
                onToggleTeamClosed={handleToggleTeamClosed}
                onStartDevelopment={handleStartDevelopment}
                onStopDevelopment={handleStopDevelopment}
                onMarkHolding={handleMarkHolding}
                onLeaveProject={handleLeaveProject}
                // Pass loading states
                markingReady={markingReady}
                confirmingReady={confirmingReady}
                togglingTeamClosed={togglingTeamClosed}
                startingDevelopment={startingDevelopment}
                stoppingDevelopment={stoppingDevelopment}
                markingHolding={markingHolding}
                leavingProject={leavingProject}
              />
            )}
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
            {activeTab === 'comments' && <CommentsTab project={project} user={user} />}
          </section>
        </div>
      </main>
    </div>
  )
}

export default ProjectDetail