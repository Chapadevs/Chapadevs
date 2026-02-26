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
 * Upload base64 image data URLs to GCS.
 * @param {string[]} dataUrls - Array of data:image/... base64 URLs
 * @param {string} previewId - Preview document ID
 * @returns {Promise<string[]>} Array of object paths (e.g. preview-images/xxx/image-1.png), or [] on failure
 */
export async function uploadBase64ImagesToGCS(dataUrls, previewId) {
  const urls = Array.isArray(dataUrls) ? dataUrls : []
  const valid = urls.filter((u) => typeof u === 'string' && u.startsWith('data:image/'))
  if (valid.length === 0 || !previewId) return []

  try {
    const client = getStorage()
    const bucket = client.bucket(BUCKET_NAME)
    const paths = []

    for (let i = 0; i < valid.length; i++) {
      const decoded = decodeDataUrl(valid[i])
      if (!decoded) continue

      const objectPath = `${PREFIX}/${previewId}/image-${i + 1}.png`
      const file = bucket.file(objectPath)

      await file.save(decoded.buffer, {
        metadata: {
          contentType: decoded.contentType,
          cacheControl: 'public, max-age=31536000',
        },
      })
      paths.push(objectPath)
    }

    return paths
  } catch (err) {
    console.warn('GCS upload failed:', err.message)
    return []
  }
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
