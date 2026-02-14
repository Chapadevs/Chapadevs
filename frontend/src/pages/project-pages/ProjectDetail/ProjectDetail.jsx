import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { Alert, Button } from '../../../components/ui-components'
import { isProgrammer } from '../../../utils/roles'
import { projectAPI, assignmentAPI } from '../../../services/api'
import Header from '../../../components/layout-components/Header/Header'
import ProjectDescriptionModal from './components/ProjectDescriptionModal/ProjectDescriptionModal'
import Timeline from '../../../components/project-components/Timeline/Timeline'
import { useProjectData } from './hooks/useProjectData'
import { useUserStatuses } from './hooks/useUserStatuses'
import { useProjectNotifications } from './hooks/useProjectNotifications'
import { calculatePermissions } from './utils/projectUtils'
import ProjectHeader from './components/ProjectHeader/ProjectHeader'
import ProjectSidebar from './components/ProjectSidebar/ProjectSidebar'
import DescriptionTab from './tabs/DescriptionTab/DescriptionTab'
import AIPreviewTab from './tabs/AIPreviewTab/AIPreviewTab'
import ProgrammersTab from './tabs/ProgrammersTab/ProgrammersTab'
import CommentsTab from './tabs/CommentsTab/CommentsTab'
import './ProjectDetail.css'

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
    hasDescriptionNotifications,
    hasAIPreviewNotifications,
    hasProgrammersNotifications,
    hasTimelineNotifications,
    hasCommentsNotifications,
  } = useProjectNotifications(project)

  const [markingReady, setMarkingReady] = useState(false)
  const [confirmingReady, setConfirmingReady] = useState(false)
  const [markingHolding, setMarkingHolding] = useState(false)
  const [togglingTeamClosed, setTogglingTeamClosed] = useState(false)
  const [startingDevelopment, setStartingDevelopment] = useState(false)
  const [stoppingDevelopment, setStoppingDevelopment] = useState(false)
  const [leavingProject, setLeavingProject] = useState(false)
  const [removingProgrammerId, setRemovingProgrammerId] = useState(null)
  const [activeTab, setActiveTab] = useState('description')
  const [descriptionPreview, setDescriptionPreview] = useState(null)
  const [descriptionFetching, setDescriptionFetching] = useState(false)
  const [descriptionFetchAttempted, setDescriptionFetchAttempted] = useState(false)

  const handleMarkReady = async () => {
    if (!window.confirm('Mark this project as Ready? This will close the team and allow programmers to start development.')) {
      return
    }

    try {
      setMarkingReady(true)
      setError(null)
      const updatedProject = await projectAPI.markReady(id)
      setProject(updatedProject)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to mark project as ready')
    } finally {
      setMarkingReady(false)
    }
  }

  const handleConfirmReady = async () => {
    if (!window.confirm("Confirm you're ready to start development on this project?")) return

    try {
      setConfirmingReady(true)
      setError(null)
      const updatedProject = await projectAPI.confirmReady(id)
      setProject(updatedProject)
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to confirm ready")
    } finally {
      setConfirmingReady(false)
    }
  }

  const handleToggleTeamClosed = async () => {
    const newStatus = !project.teamClosed
    const action = newStatus ? 'close' : 'open'
    const message = newStatus
      ? 'Close the team and return to On Hold? This will remove the project from the available list. Programmers already assigned will remain assigned.'
      : 'Open the team? This will allow programmers to join the project.'
    if (!window.confirm(message)) return

    try {
      setTogglingTeamClosed(true)
      setError(null)
      const updatedProject = await projectAPI.toggleTeamClosed(id, newStatus)
      setProject(updatedProject)
    } catch (err) {
      setError(err.response?.data?.message || err.message || `Failed to ${action} team`)
    } finally {
      setTogglingTeamClosed(false)
    }
  }

  const handleStartDevelopment = async () => {
    if (!window.confirm('Start development for this project?')) return

    try {
      setStartingDevelopment(true)
      setError(null)
      const updatedProject = await projectAPI.startDevelopment(id)
      setProject(updatedProject)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to start development')
    } finally {
      setStartingDevelopment(false)
    }
  }

  const handleStopDevelopment = async () => {
    if (!window.confirm('Stop development and return to Ready? Programmers can start development again when ready.')) return

    try {
      setStoppingDevelopment(true)
      setError(null)
      const updatedProject = await projectAPI.stopDevelopment(id)
      setProject(updatedProject)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to stop development')
    } finally {
      setStoppingDevelopment(false)
    }
  }

  const handleMarkHolding = async () => {
    if (!window.confirm('Set this project to On Hold? You can open the team again later to allow more programmers to join.')) return

    try {
      setMarkingHolding(true)
      setError(null)
      const updatedProject = await projectAPI.markHolding(id)
      setProject(updatedProject)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to set project to On Hold')
    } finally {
      setMarkingHolding(false)
    }
  }

  const handleLeaveProject = async () => {
    if (!window.confirm('Are you sure you want to leave this project? This action cannot be undone.')) {
      return
    }

    try {
      setLeavingProject(true)
      setError(null)
      await assignmentAPI.leave(id)
      // Navigate back to projects list after leaving
      navigate('/projects')
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to leave project')
      setLeavingProject(false)
    }
  }

  const handleRemoveProgrammer = async (programmerId) => {
    if (!window.confirm('Remove this programmer from the project? They will be notified.')) {
      return
    }
    try {
      setRemovingProgrammerId(programmerId)
      setError(null)
      const updatedProject = await assignmentAPI.removeProgrammer(id, programmerId)
      setProject(updatedProject)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to remove programmer')
    } finally {
      setRemovingProgrammerId(null)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }

    try {
      await projectAPI.delete(id)
      navigate('/projects')
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete project')
    }
  }

  const handlePhaseUpdate = (updatedPhase) => {
    setProject((prev) => ({
      ...prev,
      phases: (prev.phases || []).map((p) =>
        (p._id || p.id) === (updatedPhase._id || updatedPhase.id) ? updatedPhase : p
      ),
    }))
    // Reload project to get latest data
    loadProject()
  }

  const isNotAuthorized = error && typeof error === 'string' && error.toLowerCase().includes('not authorized')
  const hasDescriptionFromState = location.state?.description != null || location.state?.title != null
  const isProgrammerUnauthorized = error && !project && isProgrammer(user) && isNotAuthorized
  const hasDescription = hasDescriptionFromState || descriptionPreview
  const showDescriptionModal = isProgrammerUnauthorized && hasDescription

  useEffect(() => {
    if (
      isProgrammerUnauthorized && id &&
      !hasDescriptionFromState && !descriptionPreview && !descriptionFetchAttempted
    ) {
      setDescriptionFetchAttempted(true)
      setDescriptionFetching(true)
      assignmentAPI
        .getProjectDescriptionPublic(id)
        .then((data) => setDescriptionPreview(data))
        .catch(() => {})
        .finally(() => setDescriptionFetching(false))
    }
  }, [error, project, user, id, hasDescriptionFromState, descriptionPreview, descriptionFetchAttempted, isNotAuthorized])

  const handleDescriptionModalClose = () => {
    setDescriptionPreview(null)
    navigate('/assignments')
  }

  if (loading) {
    return <div className="project-detail-loading">Loading project...</div>
  }

  if (error && !project) {
    if (showDescriptionModal) {
      const basicInfo = {
        title: location.state?.title ?? descriptionPreview?.title,
        description: location.state?.description ?? descriptionPreview?.description,
        status: location.state?.status ?? descriptionPreview?.status,
        projectType: location.state?.projectType ?? descriptionPreview?.projectType,
        budget: location.state?.budget ?? descriptionPreview?.budget,
        timeline: location.state?.timeline ?? descriptionPreview?.timeline,
        priority: location.state?.priority ?? descriptionPreview?.priority,
        client: location.state?.client ?? descriptionPreview?.client,
      }
      return (
        <>
          <Header />
          <div className="project-detail-container">
            <ProjectDescriptionModal
              basicInfo={basicInfo}
              onClose={handleDescriptionModalClose}
            />
          </div>
        </>
      )
    }
    if (isProgrammerUnauthorized && descriptionFetching) {
      return (
        <>
          <Header />
          <div className="project-detail-container">
            <div className="project-detail-loading">Loading project description...</div>
          </div>
        </>
      )
    }
    return (
      <div className="project-detail-container">
        <Alert variant="error">{error}</Alert>
        <Button to="/projects" variant="ghost" size="sm" className="project-detail-back">← Back to Projects</Button>
      </div>
    )
  }

  if (!project) {
    return <div className="project-detail-container">Project not found</div>
  }

  const {
    isClientOwner,
    isAssignedProgrammer,
    isProgrammerInProject,
    canEdit,
    canDelete,
    canMarkReady,
    canConfirmReady,
    allTeamConfirmedReady,
    canToggleTeamClosed,
    canStartDevelopment,
    canStopDevelopment,
    canSetToHolding,
  } = calculatePermissions(user, project)

  const canGeneratePreviews = isClientOwner && previews.length < MAX_PREVIEWS_PER_PROJECT
  const showAIPreviewsSection = isClientOwner || isAssignedProgrammer

  return (
    <>
      <Header />
      <div className="project-detail-container">
        <ProjectHeader 
          project={project} 
          isClientOwner={isClientOwner}
          canDelete={canDelete}
          onDelete={handleDelete}
          markingReady={markingReady}
          onMarkReady={handleMarkReady}
          canMarkReady={canMarkReady}
          allTeamConfirmedReady={allTeamConfirmedReady}
          canConfirmReady={canConfirmReady}
          confirmingReady={confirmingReady}
          onConfirmReady={handleConfirmReady}
          canToggleTeamClosed={canToggleTeamClosed}
          togglingTeamClosed={togglingTeamClosed}
          onToggleTeamClosed={handleToggleTeamClosed}
          canStartDevelopment={canStartDevelopment}
          startingDevelopment={startingDevelopment}
          onStartDevelopment={handleStartDevelopment}
          canStopDevelopment={canStopDevelopment}
          stoppingDevelopment={stoppingDevelopment}
          onStopDevelopment={handleStopDevelopment}
          canSetToHolding={canSetToHolding}
          markingHolding={markingHolding}
          onMarkHolding={handleMarkHolding}
          isProgrammerInProject={isProgrammerInProject}
          leavingProject={leavingProject}
          onLeaveProject={handleLeaveProject}
        />
        {error && <Alert variant="error">{error}</Alert>}

        <div className="project-detail-content">
        <ProjectSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            showAIPreviewsSection={showAIPreviewsSection}
            hasDescriptionNotifications={hasDescriptionNotifications}
            hasAIPreviewNotifications={hasAIPreviewNotifications}
            hasProgrammersNotifications={hasProgrammersNotifications}
            hasTimelineNotifications={hasTimelineNotifications}
            hasCommentsNotifications={hasCommentsNotifications}
          />
          <div className="project-main">
            {activeTab === 'description' && (
              <DescriptionTab
                project={project}
              />
            )}

            {activeTab === 'ai-preview' && showAIPreviewsSection && (
              <AIPreviewTab
                project={project}
                previews={previews}
                previewsLoading={previewsLoading}
                isClientOwner={isClientOwner}
                isAssignedProgrammer={isAssignedProgrammer}
                canGeneratePreviews={canGeneratePreviews}
                loadPreviews={loadPreviews}
                setError={setError}
              />
            )}

            {activeTab === 'programmers' && (
              <ProgrammersTab
                project={project}
                getUserStatus={getUserStatus}
                isClientOwner={isClientOwner}
                onRemoveProgrammer={handleRemoveProgrammer}
                removingProgrammerId={removingProgrammerId}
              />
            )}

            {activeTab === 'timeline' && (
              <div className="project-tab-panel">
                <Timeline 
                  project={project} 
                  previews={previews}
                  onPhaseUpdate={handlePhaseUpdate}
                  onTimelineConfirmed={loadProject}
                />
              </div>
            )}

            {activeTab === 'comments' && (
              <CommentsTab project={project} user={user} />
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export { ProjectDetail as default }
