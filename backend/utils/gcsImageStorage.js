/**
 * GCS image storage for AI preview images.
 * Uploads base64 data URLs to chapadevs-website bucket and provides signed URLs.
 */

import { Storage } from '@google-cloud/storage'

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'chapadevs-website'
const PREFIX = 'preview-images'

let storage = null

function getStorage() {
  if (storage) return storage
  const keyPath = process.env.GMAIL_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (keyPath) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS || keyPath
  }
  storage = new Storage()
  return storage
}

/**
 * Decode base64 data URL to buffer.
 * @param {string} dataUrl - data:image/png;base64,... or data:image/jpeg;base64,...
 * @returns {{ buffer: Buffer, contentType: string } | null}
 */
function decodeDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return null
  const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
  if (!match) return null
  try {
    const buffer = Buffer.from(match[2], 'base64')
    const contentType = `image/${match[1]}`
    return { buffer, contentType }
  } catch {
    return null
  }
}

/**
 * Upload base64 image data URLs to GCS. Preserves slot indices: slot 0→image-1, 1→image-2, 2→image-3.
 * Skips slots with placeholder URLs (non–data:image/).
 * @param {string[]} dataUrls - Array of 3 items: [logo, hero, display]
 * @param {string} previewId - Preview document ID
 * @returns {Promise<string[]>} Object paths for uploaded slots (index-aligned; empty string for skipped)
 */
export async function uploadBase64ImagesToGCS(dataUrls, previewId) {
  const urls = Array.isArray(dataUrls) ? dataUrls : []
  if (urls.length === 0 || !previewId) return []

  try {
    const client = getStorage()
    const bucket = client.bucket(BUCKET_NAME)
    const slotPaths = []

    for (let i = 0; i < urls.length; i++) {
      const u = urls[i]
      if (!u || typeof u !== 'string' || !u.startsWith('data:image/')) {
        slotPaths.push('')
        continue
      }
      const decoded = decodeDataUrl(u)
      if (!decoded) {
        slotPaths.push('')
        continue
      }
      const objectPath = `${PREFIX}/${previewId}/image-${i + 1}.png`
      const file = bucket.file(objectPath)
      await file.save(decoded.buffer, {
        metadata: {
          contentType: decoded.contentType,
          cacheControl: 'public, max-age=31536000',
        },
      })
      slotPaths.push(objectPath)
    }
    return slotPaths
  } catch (err) {
    console.warn('GCS upload failed:', err.message)
    return []
  }
}

const HERO_PLACEHOLDER = 'https://placehold.co/1200x600?text=Hero'
const DISPLAY_PLACEHOLDER = 'https://placehold.co/400x300?text=Image'
const LOGO_PLACEHOLDER = 'https://placehold.co/96x96?text=Logo'

/**
 * Build [logoUrl, heroUrl, displayUrl] for injection.
 * Slot i: signed URL if path exists, else placeholderFromDataUrls[i] or default.
 */
export async function buildImageUrlsForInjection(dataUrls, slotPaths, expiresMs = 3600000) {
  const urls = Array.isArray(dataUrls) ? dataUrls.slice(0, 3) : []
  const paths = Array.isArray(slotPaths) ? slotPaths : []
  const defaults = [LOGO_PLACEHOLDER, HERO_PLACEHOLDER, DISPLAY_PLACEHOLDER]
  const result = []
  for (let i = 0; i < 3; i++) {
    const path = paths[i]
    const fallback = (typeof urls[i] === 'string' && urls[i].startsWith('https://')) ? urls[i] : defaults[i]
    if (path) {
      const signed = await getSignedUrlsForPaths([path], expiresMs)
      result.push(signed[0] || fallback)
    } else {
      result.push(fallback)
    }
  }
  return result
}

/**
 * Generate signed URLs for GCS object paths.
 * @param {string[]} objectPaths - Array of object paths (e.g. preview-images/xxx/image-1.png)
 * @param {number} expiresInMs - Expiration in milliseconds
 * @returns {Promise<string[]>} Array of signed URLs, or [] on failure
 */
export async function getSignedUrlsForPaths(objectPaths, expiresInMs = 3600000) {
  const paths = Array.isArray(objectPaths) ? objectPaths.filter((p) => typeof p === 'string' && p.trim()) : []
  if (paths.length === 0) return []

  try {
    const client = getStorage()
    const bucket = client.bucket(BUCKET_NAME)

    const urls = await Promise.all(
      paths.map(async (objectPath) => {
        const file = bucket.file(objectPath)
        const [url] = await file.getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + expiresInMs,
        })
        return url
      })
    )

    return urls
  } catch (err) {
    console.warn('GCS signed URL generation failed:', err.message)
    return []
  }
}
