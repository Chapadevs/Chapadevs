import api from './client'

export const assignmentAPI = {
  getAvailable: async () => {
    const response = await api.get('/assignments/available')
    return response.data
  },

  getAvailablePublic: async () => {
    const response = await api.get('/assignments/available/public')
    return response.data
  },

  getProjectDescriptionPublic: async (projectId) => {
    const response = await api.get(`/assignments/projects/${projectId}/description`)
    return response.data
  },

  assign: async (projectId, programmerId) => {
    const response = await api.post(`/assignments/${projectId}/assign`, {
      programmerId,
    })
    return response.data
  },

  accept: async (projectId) => {
    const response = await api.post(`/assignments/${projectId}/accept`)
    return response.data
  },

  reject: async (projectId) => {
    const response = await api.post(`/assignments/${projectId}/reject`)
    return response.data
  },

  unassign: async (projectId) => {
    const response = await api.delete(`/assignments/${projectId}/unassign`)
    return response.data
  },

  leave: async (projectId) => {
    const response = await api.post(`/assignments/${projectId}/leave`)
    return response.data
  },

  removeProgrammer: async (projectId, programmerId) => {
    const response = await api.post(`/assignments/${projectId}/remove-programmer`, {
      programmerId,
    })
    return response.data
  },
}
