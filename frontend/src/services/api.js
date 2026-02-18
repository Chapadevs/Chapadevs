/**
 * API barrel – re-exports all endpoint groups and the axios client.
 * Endpoint groups live in: client, authApi, projectApi, assignmentApi,
 * userApi, aiPreviewApi, notificationApi, chatApi.
 */

import api from './client'

export { authAPI } from './authApi'
export { projectAPI } from './projectApi'
export { assignmentAPI } from './assignmentApi'
export { userAPI } from './userApi'
export {
  generateAIPreview,
  generateAIPreviewStream,
  regenerateAIPreview,
  submitInquiry,
  getVertexAIStatus,
  getAIPreviewUsage,
  getAIPreviews,
  getAIPreviewById,
  deleteAIPreview,
} from './aiPreviewApi'
export { notificationAPI } from './notificationApi'
export { chatAPI } from './chatApi'

export default api
