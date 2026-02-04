import './ProjectSidebar.css'

const ProjectSidebar = ({
  activeTab,
  onTabChange,
  showAIPreviewsSection,
  hasDescriptionNotifications,
  hasAIPreviewNotifications,
  hasProgrammersNotifications,
  hasTimelineNotifications,
  hasCommentsNotifications,
  isProgrammerInProject,
  leavingProject,
  onLeaveProject,
}) => {
  return (
    <div className="project-sidebar">
      <section className="project-sidebar-tabs">
        <h3>Navigation</h3>
        <nav className="project-tab-nav">
          <button
            className={`project-tab-link ${activeTab === 'description' ? 'active' : ''}`}
            onClick={() => onTabChange('description')}
          >
            Description
            {hasDescriptionNotifications && <span className="project-tab-notification-badge"></span>}
          </button>
          {showAIPreviewsSection && (
            <button
              className={`project-tab-link ${activeTab === 'ai-preview' ? 'active' : ''}`}
              onClick={() => onTabChange('ai-preview')}
            >
              AI Preview
              {hasAIPreviewNotifications && <span className="project-tab-notification-badge"></span>}
            </button>
          )}
          <button
            className={`project-tab-link ${activeTab === 'programmers' ? 'active' : ''}`}
            onClick={() => onTabChange('programmers')}
          >
            Team
            {hasProgrammersNotifications && <span className="project-tab-notification-badge"></span>}
          </button>
          <button
            className={`project-tab-link ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => onTabChange('timeline')}
          >
            Development Progress
            {hasTimelineNotifications && <span className="project-tab-notification-badge"></span>}
          </button>
          <button
            className={`project-tab-link ${activeTab === 'comments' ? 'active' : ''}`}
            onClick={() => onTabChange('comments')}
          >
            Comments
            {hasCommentsNotifications && <span className="project-tab-notification-badge"></span>}
          </button>
        </nav>
        {isProgrammerInProject && (
          <button
            className="project-leave-button"
            onClick={onLeaveProject}
            disabled={leavingProject}
          >
            {leavingProject ? 'Leaving...' : 'Leave Project'}
          </button>
        )}
      </section>
    </div>
  )
}

export default ProjectSidebar
