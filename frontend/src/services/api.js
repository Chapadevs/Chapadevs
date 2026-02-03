import axios from 'axios'

// IMPORTANT: Vite only exposes env vars that start with VITE_
// Configure VITE_BACKEND_URL in your GitHub Pages build (e.g. https://chapadevs-backend-647906054947.us-central1.run.app/api)
const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api'

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API functions
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

  changePassword: async (currentPassword, newPassword) => {
    const response = await api.put('/auth/change-password', {
      currentPassword,
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

// Project API functions
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

  markReady: async (id) => {
    const response = await api.put(`/projects/${id}/ready`)
    return response.data
  },

  toggleTeamClosed: async (id, teamClosed) => {
    const response = await api.put(`/projects/${id}`, { teamClosed })
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

// Assignment API functions
export const assignmentAPI = {
  getAvailable: async () => {
    const response = await api.get('/assignments/available')
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
}

// User API functions
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
}

// AI Preview API functions
export const generateAIPreview = async (data) => {
  const response = await api.post('/ai-previews', data)
  return response.data
}

export const regenerateAIPreview = async (id, data) => {
  const response = await api.post(`/ai-previews/${id}/regenerate`, data)
  return response.data
}

/** Submit project inquiry (public). Sends admin + user confirmation emails via backend. */
export const submitInquiry = async (formData) => {
  const response = await api.post('/inquiry', formData)
  return response.data
}

/** Check if Vertex AI is working (no auth required). Returns { initialized, warning, message }. */
export const getVertexAIStatus = async () => {
  const response = await api.get('/vertex-ai/status')
  return response.data
}

/** Get AI usage for current user. Optional query: ?period=week|month. */
export const getAIPreviewUsage = async (period = 'month') => {
  const response = await api.get('/ai-previews/usage', { params: { period } })
  return response.data
}

export const getAIPreviews = async () => {
  const response = await api.get('/ai-previews')
  return response.data
}

export const getAIPreviewById = async (id) => {
  const response = await api.get(`/ai-previews/${id}`)
  return response.data
}

export const deleteAIPreview = async (id) => {
  const response = await api.delete(`/ai-previews/${id}`)
  return response.data
}

// Notification API functions
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

// Chat API functions
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

export default api

