import api from './client'

export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password })
    return response.data
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData)
    return response.data
  },

  getMe: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },

  updateProfile: async (userData) => {
    const response = await api.put('/auth/profile', userData)
    return response.data
  },

  deleteProfile: async () => {
    const response = await api.delete('/auth/profile')
    return response.data
  },

  changePassword: async (currentPassword) => {
    const response = await api.put('/auth/change-password', {
      currentPassword,
    })
    return response.data
  },

  confirmPasswordChange: async (token, newPassword) => {
    const response = await api.post('/auth/confirm-password-change', {
      token,
      newPassword,
    })
    return response.data
  },

  verifyEmail: async (token) => {
    const response = await api.get('/auth/verify-email', { params: { token } })
    return response.data
  },

  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email })
    return response.data
  },

  resetPassword: async (token, newPassword) => {
    const response = await api.post('/auth/reset-password', { token, newPassword })
    return response.data
  },

  logout: async () => {
    try {
      const response = await api.post('/auth/logout')
      return response.data
    } catch (error) {
      // Even if the API call fails, we should still logout locally
      console.error('Logout API call failed:', error)
      return { message: 'Logged out' }
    }
  },
}
