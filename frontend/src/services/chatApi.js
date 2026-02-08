import api from './client'

export const chatAPI = {
  getMessages: async (projectId, page = 1, limit = 50) => {
    const response = await api.get(`/projects/${projectId}/messages`, { params: { page, limit } })
    return response.data
  },

  sendMessage: async (projectId, content) => {
    const response = await api.post(`/projects/${projectId}/messages`, { content })
    return response.data
  },

  markAsRead: async (projectId) => {
    const response = await api.put(`/projects/${projectId}/messages/read`)
    return response.data
  },
}
