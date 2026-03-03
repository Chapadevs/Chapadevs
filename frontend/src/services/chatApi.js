import api from './client'

export const chatAPI = {
  getMessages: async (projectId, page = 1, limit = 50) => {
    const response = await api.get(`/projects/${projectId}/messages`, { params: { page, limit } })
    return response.data
  },

  uploadAttachment: async (projectId, formData) => {
    const response = await api.post(`/projects/${projectId}/chat-attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  sendMessage: async (projectId, content, attachments = []) => {
    const response = await api.post(`/projects/${projectId}/messages`, {
      content: content || '',
      attachments: attachments.length > 0 ? attachments : undefined,
    })
    return response.data
  },

  markAsRead: async (projectId) => {
    const response = await api.put(`/projects/${projectId}/messages/read`)
    return response.data
  },
}
