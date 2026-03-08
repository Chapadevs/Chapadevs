import api from './client'

export const userAPI = {
  getUsers: async () => {
    const response = await api.get('/users')
    return response.data
  },

  getUserById: async (id) => {
    const response = await api.get(`/users/${id}`)
    return response.data
  },

  updateUser: async (id, payload) => {
    const response = await api.put(`/users/${id}`, payload)
    return response.data
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`)
    return response.data
  },

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
