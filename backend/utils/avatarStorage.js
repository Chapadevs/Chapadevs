/**
 * GCS storage for user profile avatars.
 * Stores avatars in chapadevs-website/assets/avatars/.
 * Path: assets/avatars/{userId}-{timestamp}.{ext}
 *
 * Bucket permissions: For avatars to display, ensure assets/avatars/* is publicly
 * readable (e.g. uniform bucket-level access or object-level IAM). If the bucket
 * is private, consider using signed URLs instead of public URLs.
 */

import { Storage } from '@google-cloud/storage'

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'chapadevs-website'
const PREFIX = 'assets/avatars'

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
 * Parse GCS object path from a public URL or path string.
 * @param {string} urlOrPath - Full URL or object path
 * @returns {string|null} Object path (e.g. assets/avatars/xxx.png) or null
 */
function parseObjectPath(urlOrPath) {
  if (!urlOrPath || typeof urlOrPath !== 'string') return null
  const trimmed = urlOrPath.trim()
  const gcsPrefix = `https://storage.googleapis.com/${BUCKET_NAME}/`
  if (trimmed.startsWith(gcsPrefix)) {
    return trimmed.slice(gcsPrefix.length)
  }
  if (trimmed.startsWith(PREFIX + '/') || trimmed.startsWith('assets/avatars/')) {
    return trimmed
  }
  return null
}

/**
 * Upload user avatar (base64 data URL) to GCS.
 * @param {string} dataUrl - data:image/png;base64,... or data:image/jpeg;base64,...
 * @param {string} userId - User ID for filename
 * @returns {Promise<string|null>} Public URL of uploaded avatar, or null on failure
 */
export async function uploadAvatarToGCS(dataUrl, userId) {
  if (!dataUrl || !userId) return null

  const decoded = decodeDataUrl(dataUrl)
  if (!decoded) return null

  try {
    const client = getStorage()
    const bucket = client.bucket(BUCKET_NAME)
    const ext = decoded.contentType.split('/')[1] || 'png'
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const objectPath = `${PREFIX}/${userId}-${uniqueSuffix}.${ext}`

    const file = bucket.file(objectPath)
    await file.save(decoded.buffer, {
      metadata: {
        contentType: decoded.contentType,
        cacheControl: 'public, max-age=31536000',
      },
    })

    return `https://storage.googleapis.com/${BUCKET_NAME}/${objectPath}`
  } catch (err) {
    console.warn('GCS avatar upload failed:', err.message)
    return null
  }
}

/**
 * Delete avatar from GCS.
 * @param {string} urlOrPath - Full GCS URL or object path
 * @returns {Promise<boolean>} True if deleted, false otherwise
 */
export async function deleteAvatarFromGCS(urlOrPath) {
  const objectPath = parseObjectPath(urlOrPath)
  if (!objectPath) return false

  try {
    const client = getStorage()
    const bucket = client.bucket(BUCKET_NAME)
    const file = bucket.file(objectPath)
    const [exists] = await file.exists()
    if (exists) {
      await file.delete()
      return true
    }
    return false
  } catch (err) {
    console.warn('GCS avatar delete failed:', err.message)
    return false
  }
}

/**
 * Check if avatar value is a GCS-stored avatar (URL or path).
 * @param {string} avatar - Avatar value from User model
 * @returns {boolean}
 */
export function isGcsAvatar(avatar) {
  return !!parseObjectPath(avatar)
}

/** Default expiry for signed avatar URLs: 1 hour */
const SIGNED_URL_EXPIRY_MS = 60 * 60 * 1000

/**
 * Get a signed URL for a GCS avatar. Use when the bucket is private.
 * @param {string} urlOrPath - Full GCS URL or object path (e.g. assets/avatars/xxx.jpeg)
 * @param {number} [expiresInMs] - Expiration in milliseconds (default 1 hour)
 * @returns {Promise<string|null>} Signed URL, or original urlOrPath if signing fails (e.g. public bucket)
 */
export async function getSignedAvatarUrl(urlOrPath, expiresInMs = SIGNED_URL_EXPIRY_MS) {
  const objectPath = parseObjectPath(urlOrPath)
  if (!objectPath) return urlOrPath

  try {
    const client = getStorage()
    const bucket = client.bucket(BUCKET_NAME)
    const file = bucket.file(objectPath)
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresInMs,
    })
    return url
  } catch (err) {
    console.warn('GCS signed avatar URL failed:', err.message)
    return urlOrPath
  }
}

/**
 * Create a readable stream of an avatar from GCS. For proxying to clients.
 * @param {string} urlOrPath - Full GCS URL or object path
 * @returns {Promise<{ stream: import('stream').Readable, contentType: string }|null>}
 */
export async function getAvatarStream(urlOrPath) {
  const objectPath = parseObjectPath(urlOrPath)
  if (!objectPath) return null

  try {
    const client = getStorage()
    const bucket = client.bucket(BUCKET_NAME)
    const file = bucket.file(objectPath)
    const [exists] = await file.exists()
    if (!exists) return null

    const [metadata] = await file.getMetadata()
    const contentType = metadata?.contentType || 'image/jpeg'
    const stream = file.createReadStream()
    return { stream, contentType }
  } catch (err) {
    console.warn('GCS avatar stream failed:', err.message)
    return null
  }
}
