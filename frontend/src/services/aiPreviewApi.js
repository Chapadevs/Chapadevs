import api from './client'

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
