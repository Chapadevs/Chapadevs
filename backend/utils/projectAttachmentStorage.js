/**
 * GCS storage for project phase and sub-step attachments.
 * Stores project phase and sub-step attachments in chapadevs-website/attachments/.
 */

import { Storage } from '@google-cloud/storage'
import path from 'path'
import { getSignedUrlsForPaths } from './gcsImageStorage.js'

const BUCKET_NAME = process.env.GCS_PROJECT_ATTACHMENTS_BUCKET || 'chapadevs-website'
const PREFIX = 'attachments'

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
 * Get file extension from filename.
 * @param {string} filename
 * @returns {string}
 */
function getExt(filename) {
  const ext = path.extname(filename)
  return ext || '.bin'
}

/**
 * Upload a project attachment to GCS.
 * @param {string} projectId - Project ID
 * @param {string} phaseId - Phase ID
 * @param {Buffer} fileBuffer - File content
 * @param {string} filename - Original filename
 * @param {string} mimeType - MIME type (e.g. image/jpeg)
 * @param {number} [subStepOrder] - Optional sub-step order for sub-step attachments
 * @returns {Promise<string>} Public URL of the uploaded file
 */
export async function uploadProjectAttachment(projectId, phaseId, fileBuffer, filename, mimeType, subStepOrder) {
  if (!projectId || !phaseId || !fileBuffer || !filename) {
    throw new Error('projectId, phaseId, fileBuffer, and filename are required')
  }

  try {
    const client = getStorage()
    const bucket = client.bucket(BUCKET_NAME)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = getExt(filename)
    const safeFilename = `${uniqueSuffix}${ext}`

    let objectPath
    if (subStepOrder != null) {
      objectPath = `${PREFIX}/${projectId}/phases/${phaseId}/substeps/${subStepOrder}/${safeFilename}`
    } else {
      objectPath = `${PREFIX}/${projectId}/phases/${phaseId}/${safeFilename}`
    }

    const file = bucket.file(objectPath)
    await file.save(fileBuffer, {
      metadata: {
        contentType: mimeType || 'application/octet-stream',
        cacheControl: 'public, max-age=31536000',
      },
    })

    return `https://storage.googleapis.com/${BUCKET_NAME}/${objectPath}`
  } catch (err) {
    console.warn('GCS project attachment upload failed:', err.message)
    throw err
  }
}

/**
 * Upload a chat attachment to GCS (project comments).
 * @param {string} projectId - Project ID
 * @param {Buffer} fileBuffer - File content
 * @param {string} filename - Original filename
 * @param {string} mimeType - MIME type (e.g. image/jpeg)
 * @returns {Promise<string>} Public URL of the uploaded file
 */
export async function uploadChatAttachment(projectId, fileBuffer, filename, mimeType) {
  if (!projectId || !fileBuffer || !filename) {
    throw new Error('projectId, fileBuffer, and filename are required')
  }

  try {
    const client = getStorage()
    const bucket = client.bucket(BUCKET_NAME)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = getExt(filename)
    const safeFilename = `${uniqueSuffix}${ext}`
    const objectPath = `${PREFIX}/chat/${projectId}/${safeFilename}`

    const file = bucket.file(objectPath)
    await file.save(fileBuffer, {
      metadata: {
        contentType: mimeType || 'application/octet-stream',
        cacheControl: 'public, max-age=31536000',
      },
    })

    return `https://storage.googleapis.com/${BUCKET_NAME}/${objectPath}`
  } catch (err) {
    console.warn('GCS chat attachment upload failed:', err.message)
    throw err
  }
}

/**
 * Parse GCS object path from a public URL or path string.
 * @param {string} urlOrPath - Full URL (https://storage.googleapis.com/bucket/path) or object path
 * @returns {string|null} Object path (e.g. project-attachments/.../file.ext) or null
 */
function parseObjectPath(urlOrPath) {
  if (!urlOrPath || typeof urlOrPath !== 'string') return null
  const trimmed = urlOrPath.trim()
  const gcsPrefix = `https://storage.googleapis.com/${BUCKET_NAME}/`
  if (trimmed.startsWith(gcsPrefix)) {
    return trimmed.slice(gcsPrefix.length)
  }
  if (trimmed.startsWith(PREFIX + '/')) {
    return trimmed
  }
  return null
}

/**
 * Delete a project attachment from GCS.
 * @param {string} urlOrPath - Full GCS URL or object path
 * @returns {Promise<boolean>} True if deleted, false if not found or not a GCS URL
 */
export async function deleteProjectAttachment(urlOrPath) {
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
    console.warn('GCS project attachment delete failed:', err.message)
    return false
  }
}

/**
 * Get signed URLs for GCS attachment URLs (for private bucket access).
 * @param {string[]} urls - Full GCS URLs (https://storage.googleapis.com/bucket/path)
 * @param {number} expiresInMs - Expiration in milliseconds
 * @returns {Promise<string[]>} Signed URLs in same order; empty string for non-GCS or failed
 */
export async function getSignedUrlsForAttachments(urls, expiresInMs = 3600000) {
  const paths = (Array.isArray(urls) ? urls : [])
    .map((u) => parseObjectPath(u))
    .filter(Boolean)
  if (paths.length === 0) return []
  const signed = await getSignedUrlsForPaths(paths, expiresInMs)
  return signed
}
