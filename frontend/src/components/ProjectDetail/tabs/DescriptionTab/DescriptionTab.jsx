import ProjectActions from '../../components/ProjectActions/ProjectActions'
import ProjectInfoSection from '../../components/ProjectInfoSection/ProjectInfoSection'
import ProjectOverview from '../../components/ProjectOverview/ProjectOverview'
import './DescriptionTab.css'

const DescriptionTab = ({
  project,
  canMarkReady,
  canToggleTeamClosed,
  canDelete,
  markingReady,
  togglingTeamClosed,
  onMarkReady,
  onToggleTeamClosed,
  onDelete,
}) => {
  return (
    <>
      <ProjectActions
        canMarkReady={canMarkReady}
        canToggleTeamClosed={canToggleTeamClosed}
        canDelete={canDelete}
        markingReady={markingReady}
        togglingTeamClosed={togglingTeamClosed}
        project={project}
        onMarkReady={onMarkReady}
        onToggleTeamClosed={onToggleTeamClosed}
        onDelete={onDelete}
      />
      <ProjectInfoSection project={project} />
      <ProjectOverview project={project} />
    </>
  )
}

export default DescriptionTab
