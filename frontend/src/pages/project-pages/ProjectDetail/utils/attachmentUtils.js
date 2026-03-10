/**
 * Attachment utilities shared by AttachmentManager, AssetsTab, and related components.
 */

export function isGcsUrl(url) {
  return url && typeof url === 'string' && url.startsWith('https://storage.googleapis.com/')
}

export function getFileIcon(type) {
  if (!type) return '📄'
  if (type.includes('image')) return '🖼️'
  if (type.includes('pdf')) return '📕'
  if (type.includes('word') || type.includes('document')) return '📝'
  if (type.includes('zip') || type.includes('archive')) return '📦'
  return '📄'
}

export function getFileUrl(url) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api'
  return `${backendUrl.replace('/api', '')}${url}`
}

export function isImage(type) {
  return type && String(type).includes('image')
}

export function parseNum(v) {
  const n = parseInt(String(v).trim(), 10)
  return Number.isInteger(n) && n >= 0 ? n : null
}

export function parseTypes(v) {
  return String(v)
    .split(/[,;\s]+/)
    .map((t) => t.toLowerCase().trim())
    .filter(Boolean)
}

export function getFileFormat(item) {
  const ext = (item.filename || '').split('.').pop()?.toUpperCase()
  if (ext) return ext
  const type = String(item.type || '')
  if (type.includes('svg')) return 'SVG'
  if (type.includes('png')) return 'PNG'
  if (type.includes('jpeg') || type.includes('jpg')) return 'JPG'
  if (type.includes('webp')) return 'WEBP'
  if (type.includes('gif')) return 'GIF'
  if (type.includes('pdf')) return 'PDF'
  return null
}
