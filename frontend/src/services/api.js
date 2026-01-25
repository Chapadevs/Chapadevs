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
}

// AI Preview API functions
export const generateAIPreview = async (data) => {
  const response = await api.post('/ai-previews', data)
  return response.data
}

/** Check if Vertex AI is working (no auth required). Returns { initialized, warning, message }. */
export const getVertexAIStatus = async () => {
  const response = await api.get('/vertex-ai/status')
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

export default api

