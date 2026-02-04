import ProjectInfoSection from '../../components/ProjectInfoSection/ProjectInfoSection'
import ProjectOverview from '../../components/ProjectOverview/ProjectOverview'
import './DescriptionTab.css'

const DescriptionTab = ({
  project,
}) => {
  return (
    <>
      <ProjectInfoSection project={project} />
      <ProjectOverview project={project} />
    </>
  )
}

export default DescriptionTab
