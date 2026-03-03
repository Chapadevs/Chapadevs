/**
 * Resolve avatar URL for display.
 * Handles: data URLs, legacy /uploads/avatars/, and GCS URLs (https://storage.googleapis.com/...).
 */
export function getAvatarUrl(avatar) {
  if (!avatar) return null
  if (avatar.startsWith('data:image/')) return avatar
  if (avatar.startsWith('/uploads/')) {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api'
    const baseUrl = backendUrl.replace('/api', '').replace(/\/$/, '')
    return `${baseUrl}${avatar}`
  }
  return avatar
}
