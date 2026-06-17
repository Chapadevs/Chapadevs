const CREATE_PROJECT_IDEA_STORAGE_KEY = 'chapadevs_create_from_idea'
const PUBLIC_IDEAS_STORAGE_KEY = 'chapadevs_public_ideas_session'

const readJson = (key) => {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch (_) {
    return null
  }
}

const writeJson = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (_) {
    return false
  }
}

const removeKey = (key) => {
  try {
    sessionStorage.removeItem(key)
  } catch (_) {
    /* ignore storage failures */
  }
}

export const writeCreateProjectIdeaSession = (payload) =>
  writeJson(CREATE_PROJECT_IDEA_STORAGE_KEY, payload)

export const readCreateProjectIdeaSession = () =>
  readJson(CREATE_PROJECT_IDEA_STORAGE_KEY)

export const clearCreateProjectIdeaSession = () =>
  removeKey(CREATE_PROJECT_IDEA_STORAGE_KEY)

export const writePublicIdeasSession = ({ sourcePrompt, ideas }) =>
  writeJson(PUBLIC_IDEAS_STORAGE_KEY, {
    sourcePrompt,
    ideas,
    savedAt: new Date().toISOString(),
  })

export const readPublicIdeasSession = () =>
  readJson(PUBLIC_IDEAS_STORAGE_KEY)

export const clearPublicIdeasSession = () =>
  removeKey(PUBLIC_IDEAS_STORAGE_KEY)
