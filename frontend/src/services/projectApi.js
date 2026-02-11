import api from './client'

export const projectAPI = {
  getAll: async () => {
    const response = await api.get('/projects')
    return response.data
  },

  getMyProjects: async () => {
    const response = await api.get('/projects/my-projects')
    return response.data
  },

  getAssignedProjects: async () => {
    const response = await api.get('/projects/assigned')
    return response.data
  },

  getById: async (id) => {
    const response = await api.get(`/projects/${id}`)
    return response.data
  },

  getPreviews: async (id) => {
    const response = await api.get(`/projects/${id}/previews`)
    return response.data
  },

  getPhaseProposal: async (projectId) => {
    const response = await api.get(`/projects/${projectId}/phases/proposal`)
    return response.data
  },

  confirmPhases: async (projectId, definitions) => {
    const response = await api.post(`/projects/${projectId}/phases/confirm`, definitions)
    return response.data
  },

  create: async (projectData) => {
    const response = await api.post('/projects', projectData)
    return response.data
  },

  update: async (id, projectData) => {
    const response = await api.put(`/projects/${id}`, projectData)
    return response.data
  },

  delete: async (id) => {
    const response = await api.delete(`/projects/${id}`)
    return response.data
  },

  confirmReady: async (id) => {
    const response = await api.put(`/projects/${id}/confirm-ready`)
    return response.data
  },

  markReady: async (id) => {
    const response = await api.put(`/projects/${id}/mark-ready`)
    return response.data
  },

  markHolding: async (id) => {
    const response = await api.put(`/projects/${id}/holding`)
    return response.data
  },

  toggleTeamClosed: async (id, teamClosed) => {
    const response = await api.put(`/projects/${id}`, { teamClosed })
    return response.data
  },

  startDevelopment: async (id) => {
    const response = await api.put(`/projects/${id}/start-development`)
    return response.data
  },

  stopDevelopment: async (id) => {
    const response = await api.put(`/projects/${id}/stop-development`)
    return response.data
  },

  updatePhase: async (projectId, phaseId, data) => {
    const response = await api.patch(`/projects/${projectId}/phases/${phaseId}`, data)
    return response.data
  },

  addSubStep: async (projectId, phaseId, subStepData) => {
    const response = await api.post(`/projects/${projectId}/phases/${phaseId}/sub-steps`, subStepData)
    return response.data
  },

  updateSubStep: async (projectId, phaseId, subStepId, data) => {
    const response = await api.post(`/projects/${projectId}/phases/${phaseId}/sub-steps`, {
      subStepId,
      ...data,
    })
    return response.data
  },

  answerQuestion: async (projectId, phaseId, questionId, answer) => {
    const response = await api.post(
      `/projects/${projectId}/phases/${phaseId}/questions/${questionId}/answer`,
      { answer }
    )
    return response.data
  },

  approvePhase: async (projectId, phaseId, approved = true) => {
    const response = await api.post(`/projects/${projectId}/phases/${phaseId}/approve`, {
      approved,
    })
    return response.data
  },

  uploadAttachment: async (projectId, phaseId, formData) => {
    const response = await api.post(
      `/projects/${projectId}/phases/${phaseId}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },

  deleteAttachment: async (projectId, phaseId, attachmentId) => {
    const response = await api.delete(
      `/projects/${projectId}/phases/${phaseId}/attachments/${attachmentId}`
    )
    return response.data
  },
}
