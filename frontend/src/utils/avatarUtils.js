/**
 * Resolve avatar URL for display.
 * Handles: data URLs, legacy /uploads/avatars/, GCS signed URLs, and raw GCS URLs (proxied when bucket is private).
 */
export function getAvatarUrl(avatar) {
  if (!avatar) return null
  if (avatar.startsWith('data:image/')) return avatar
  if (avatar.startsWith('/uploads/')) {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api'
    const baseUrl = backendUrl.replace('/api', '').replace(/\/$/, '')
    return `${baseUrl}${avatar}`
  }
  // Raw GCS URL (no query params) - use proxy when bucket is private
  if (avatar.startsWith('https://storage.googleapis.com/') && !avatar.includes('X-Goog-')) {
    const apiUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api'
    const baseUrl = apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')
    return `${baseUrl}/api/avatars/image?url=${encodeURIComponent(avatar)}`
  }
  return avatar
}
