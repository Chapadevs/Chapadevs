import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { projectAPI, assignmentAPI } from '../../services/api'
import Header from '../../components/Header/Header'
import Timeline from '../../components/Timeline/Timeline'
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
  const [markingHolding, setMarkingHolding] = useState(false)
  const [togglingTeamClosed, setTogglingTeamClosed] = useState(false)
  const [leavingProject, setLeavingProject] = useState(false)
  const [removingProgrammerId, setRemovingProgrammerId] = useState(null)
  const [activeTab, setActiveTab] = useState('description')

  const handleMarkReady = async () => {
    if (!window.confirm('Mark this project as Ready for assignment?')) {
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

  const handleMarkHolding = async () => {
    if (!window.confirm('Set this project back to Holding status? This will remove it from being available for assignment.')) {
      return
    }

    try {
      setMarkingHolding(true)
      setError(null)
      const updatedProject = await projectAPI.markHolding(id)
      setProject(updatedProject)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to set project to Holding')
    } finally {
      setMarkingHolding(false)
    }
  }

  const handleToggleTeamClosed = async () => {
    const newStatus = !project.teamClosed
    const action = newStatus ? 'close' : 'open'
    if (!window.confirm(`${newStatus ? 'Close' : 'Open'} the team for this project? ${newStatus ? 'This will prevent other programmers from joining.' : 'This will allow other programmers to join.'}`)) {
      return
    }

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

  if (loading) {
    return <div className="project-detail-loading">Loading project...</div>
  }

  if (error && !project) {
    return (
      <div className="project-detail-container">
        <div className="error-message">{error}</div>
        <Link to="/projects" className="project-detail-back">← Back to Projects</Link>
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
    canToggleTeamClosed,
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
          markingHolding={markingHolding}
          markingReady={markingReady}
          onMarkHolding={handleMarkHolding}
          onMarkReady={handleMarkReady}
          isProgrammerInProject={isProgrammerInProject}
          leavingProject={leavingProject}
          onLeaveProject={handleLeaveProject}
        />

        {error && <div className="error-message">{error}</div>}

        <div className="project-detail-content">
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
                canToggleTeamClosed={canToggleTeamClosed}
                togglingTeamClosed={togglingTeamClosed}
                onToggleTeamClosed={handleToggleTeamClosed}
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
                />
              </div>
            )}

            {activeTab === 'comments' && (
              <CommentsTab project={project} user={user} />
            )}
          </div>

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
        </div>
      </div>
    </>
  )
}

export { ProjectDetail as default }
