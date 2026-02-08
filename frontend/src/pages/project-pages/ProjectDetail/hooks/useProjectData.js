import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { projectAPI } from '../../../../services/api'

export const useProjectData = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [previews, setPreviews] = useState([])
  const [previewsLoading, setPreviewsLoading] = useState(false)

  const loadProject = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await projectAPI.getById(id)
      setProject(data)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadPreviews = useCallback(async () => {
    try {
      setPreviewsLoading(true)
      const data = await projectAPI.getPreviews(id)
      setPreviews(data)
    } catch (err) {
      console.error('Failed to load previews', err)
      setPreviews([])
    } finally {
      setPreviewsLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (!id || id === 'undefined') {
      navigate('/projects', { replace: true })
      return
    }
    loadProject()
  }, [id, navigate, loadProject])

  useEffect(() => {
    if (project && id) {
      loadPreviews()
    }
  }, [id, project?._id, loadPreviews])

  return {
    project,
    setProject,
    loading,
    error,
    setError,
    previews,
    previewsLoading,
    loadProject,
    loadPreviews,
  }
}
