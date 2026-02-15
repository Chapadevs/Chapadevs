import { Button, SectionTitle } from '../../../../../components/ui-components'
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
}) => {
  return (
    <div className="project-sidebar">
      <section className="project-sidebar-tabs">
        <SectionTitle className="mb-4">Navigation</SectionTitle>
        <nav className="project-tab-nav">
          <Button
            variant="ghost"
            className={`project-tab-link ${activeTab === 'description' ? 'active' : ''}`}
            onClick={() => onTabChange('description')}
          >
            Description
            {hasDescriptionNotifications && <span className="project-tab-notification-badge"></span>}
          </Button>
          {showAIPreviewsSection && (
            <Button
              variant="ghost"
              className={`project-tab-link ${activeTab === 'ai-preview' ? 'active' : ''}`}
              onClick={() => onTabChange('ai-preview')}
            >
              Previews
              {hasAIPreviewNotifications && <span className="project-tab-notification-badge"></span>}
            </Button>
          )}
          <Button
            variant="ghost"
            className={`project-tab-link ${activeTab === 'programmers' ? 'active' : ''}`}
            onClick={() => onTabChange('programmers')}
          >
            Team
            {hasProgrammersNotifications && <span className="project-tab-notification-badge"></span>}
          </Button>
          <Button
            variant="ghost"
            className={`project-tab-link ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => onTabChange('timeline')}
          >
            Workspace
            {hasTimelineNotifications && <span className="project-tab-notification-badge"></span>}
          </Button>
          <Button
            variant="ghost"
            className={`project-tab-link ${activeTab === 'comments' ? 'active' : ''}`}
            onClick={() => onTabChange('comments')}
          >
            Chat
            {hasCommentsNotifications && <span className="project-tab-notification-badge"></span>}
          </Button>
        </nav>
      </section>
    </div>
  )
}

export default ProjectSidebar
