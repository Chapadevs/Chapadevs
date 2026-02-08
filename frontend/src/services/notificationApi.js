import api from './client'

export const notificationAPI = {
  getAll: async (unreadOnly = false) => {
    const params = unreadOnly ? { unreadOnly: 'true' } : {}
    const response = await api.get('/notifications', { params })
    return response.data
  },

  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count')
    return response.data
  },

  markAsRead: async (id) => {
    const response = await api.put(`/notifications/${id}/read`)
    return response.data
  },

  markAllAsRead: async () => {
    const response = await api.put('/notifications/read-all')
    return response.data
  },

  delete: async (id) => {
    const response = await api.delete(`/notifications/${id}`)
    return response.data
  },
}
