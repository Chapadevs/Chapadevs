import api from './client'

const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const getBaseUrl = () => import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api'

export const generateAIPreview = async (data) => {
  const response = await api.post('/ai-previews', data)
  return response.data
}

/**
 * Generate AI preview with streaming. Calls onChunk(text) for each streamed piece,
 * onDone({ previewId, status, result, tokenUsage }) when complete, onError(message) on failure.
 */
export const generateAIPreviewStream = async (data, { onChunk, onDone, onError }) => {
  const res = await fetch(`${getBaseUrl()}/ai-previews/stream`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    onError?.(err.error || err.message || 'Request failed')
    return
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split('\n\n')
      buffer = events.pop() || ''
      for (const event of events) {
        const dataLine = event.split('\n').find((l) => l.startsWith('data: '))
        if (!dataLine) continue
        try {
          const payload = JSON.parse(dataLine.slice(6))
          if (payload.type === 'chunk' && payload.text != null) onChunk?.(payload.text)
          else if (payload.type === 'done') onDone?.(payload)
          else if (payload.type === 'error') onError?.(payload.message || 'Unknown error')
        } catch (_) {}
      }
    }
    const dataLine = buffer.split('\n').find((l) => l.startsWith('data: '))
    if (dataLine) {
      try {
        const payload = JSON.parse(dataLine.slice(6))
        if (payload.type === 'chunk' && payload.text != null) onChunk?.(payload.text)
        else if (payload.type === 'done') onDone?.(payload)
        else if (payload.type === 'error') onError?.(payload.message || 'Unknown error')
      } catch (_) {}
    }
  } finally {
    reader.releaseLock()
  }
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
