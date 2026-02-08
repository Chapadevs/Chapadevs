import api from './client'

export const userAPI = {
  getProgrammers: async () => {
    const response = await api.get('/users/programmers')
    return response.data
  },

  updateStatus: async (status) => {
    const response = await api.put('/users/status', { status })
    return response.data
  },

  getUserStatuses: async (userIds) => {
    const response = await api.post('/users/statuses', { userIds })
    return response.data
  },

  getUserProfile: async (userId) => {
    const response = await api.get(`/users/${userId}/profile`)
    return response.data
  },
}
