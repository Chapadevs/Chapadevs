/**
 * Extracts page and component paths from AIPreview metadata (websitePreviewFiles).
 * Used to inform Workspace AI generation so Development phase sub-steps can map to actual generated pages/components.
 */

/**
 * Extract page and component names from websitePreviewFiles keys.
 * @param {Object} metadata - AIPreview.metadata (may have websitePreviewFiles)
 * @returns {{ pages: string[], components: string[] }}
 */
export function extractPageAndComponentPaths(metadata) {
  if (!metadata || typeof metadata !== 'object') return { pages: [], components: [] }

  const files = metadata.websitePreviewFiles
  if (!files || typeof files !== 'object') return { pages: [], components: [] }

  const pages = []
  const components = []

  for (const path of Object.keys(files)) {
    const normalized = path.replace(/^\/+/, '').toLowerCase()
    if (normalized.startsWith('pages/') && (normalized.endsWith('.js') || normalized.endsWith('.jsx'))) {
      const name = path.split('/').pop().replace(/\.(jsx?|tsx?)$/i, '')
      if (name) pages.push(name)
    } else if (
      (normalized.startsWith('components/') || normalized.startsWith('components/ui/')) &&
      (normalized.endsWith('.js') || normalized.endsWith('.jsx'))
    ) {
      const name = path.split('/').pop().replace(/\.(jsx?|tsx?)$/i, '')
      if (name) components.push(name)
    }
  }

  return { pages: [...new Set(pages)], components: [...new Set(components)] }
}
