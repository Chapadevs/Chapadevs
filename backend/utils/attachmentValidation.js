/**
 * Validates uploaded files against required attachment constraints (size, type).
 * Used when client uploads for a specific required attachment with strict specs.
 * Uses built-in buffer parsing for PNG/JPEG to avoid external dependencies.
 */

const EXT_TO_MIME = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  gif: 'image/gif',
}

/**
 * Normalize allowedTypes (e.g. ['png', 'jpeg'] or ['image/png']) to MIME types.
 * @param {string[]} allowedTypes - e.g. ['png', 'jpeg'] or ['image/png', 'image/jpeg']
 * @returns {string[]} MIME types
 */
function normalizeAllowedMimes(allowedTypes) {
  if (!Array.isArray(allowedTypes) || allowedTypes.length === 0) return []
  return allowedTypes.map((t) => {
    const lower = String(t).toLowerCase().trim()
    if (lower.startsWith('image/')) return lower
    return EXT_TO_MIME[lower] || `image/${lower}`
  })
}

/**
 * Check if file mimetype matches allowed types.
 * @param {string} mimetype - e.g. 'image/png'
 * @param {string[]} allowedMimes - e.g. ['image/png', 'image/jpeg']
 */
function isMimeAllowed(mimetype, allowedMimes) {
  if (!allowedMimes.length) return true
  const mime = (mimetype || '').toLowerCase()
  return allowedMimes.some((a) => a.toLowerCase() === mime)
}

/**
 * Read image dimensions from buffer (PNG, JPEG). No external deps.
 * @param {Buffer} buf
 * @returns {{ width: number, height: number } | null}
 */
function getImageDimensions(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 24) return null
  // PNG: 89 50 4E 47 0D 0A 1A 0A, then IHDR chunk (4 len + 4 type + 4 width + 4 height)
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    if (buf.length < 24) return null
    const width = buf.readUInt32BE(16)
    const height = buf.readUInt32BE(20)
    return width > 0 && height > 0 ? { width, height } : null
  }
  // JPEG: FF D8 FF ... SOF0/SOF1/SOF2 (FF C0/C1/C2) has dimensions at offset 5 and 7
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) {
        i++
        continue
      }
      const marker = buf[i + 1]
      if (marker >= 0xc0 && marker <= 0xc2) {
        const height = buf.readUInt16BE(i + 5)
        const width = buf.readUInt16BE(i + 7)
        return width > 0 && height > 0 ? { width, height } : null
      }
      const len = buf.readUInt16BE(i + 2)
      i += 2 + len
    }
    return null
  }
  return null
}

/**
 * Validate an uploaded file against required attachment constraints.
 * @param {Buffer} buffer - File buffer
 * @param {string} mimetype - File MIME type
 * @param {Object} constraints - { minWidth, maxWidth, minHeight, maxHeight, allowedTypes }
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateAttachmentForRequired(buffer, mimetype, constraints) {
  if (!constraints) return { valid: true }

  const { minWidth, maxWidth, minHeight, maxHeight, allowedTypes } = constraints

  // Type validation
  const allowedMimes = normalizeAllowedMimes(allowedTypes || [])
  if (allowedMimes.length > 0) {
    if (!isMimeAllowed(mimetype, allowedMimes)) {
      const allowed = (allowedTypes || []).join(', ')
      return {
        valid: false,
        error: `File type not allowed. Allowed: ${allowed}. Got: ${mimetype || 'unknown'}`,
      }
    }
  }

  // Dimension validation (only for raster images; SVG has no dimensions)
  const isSvg = (mimetype || '').toLowerCase().includes('svg')
  if (!isSvg && (minWidth != null || maxWidth != null || minHeight != null || maxHeight != null)) {
    const dims = getImageDimensions(buffer)
    if (!dims || !dims.width || !dims.height) {
      return {
        valid: false,
        error: 'Could not read image dimensions. Supported formats: PNG, JPEG.',
      }
    }

    const { width, height } = dims

    if (minWidth != null && width < minWidth) {
      return { valid: false, error: `Width must be at least ${minWidth}px. Got ${width}px.` }
    }
    if (maxWidth != null && width > maxWidth) {
      return { valid: false, error: `Width must be at most ${maxWidth}px. Got ${width}px.` }
    }
    if (minHeight != null && height < minHeight) {
      return { valid: false, error: `Height must be at least ${minHeight}px. Got ${height}px.` }
    }
    if (maxHeight != null && height > maxHeight) {
      return { valid: false, error: `Height must be at most ${maxHeight}px. Got ${height}px.` }
    }
  }

  return { valid: true }
}
