/**
 * Centralized role constants and helpers.
 * Single source of truth for role names and "is client/programmer/admin".
 */

export const ROLES = {
  CLIENT: 'client',
  USER: 'user',
  PROGRAMMER: 'programmer',
  ADMIN: 'admin',
}

const CLIENT_ROLES = [ROLES.CLIENT, ROLES.USER]

/**
 * @param {object} user - User object with optional .role
 * @returns {boolean}
 */
export const isClient = (user) =>
  user && CLIENT_ROLES.includes(user.role)

/**
 * @param {object} user - User object with optional .role
 * @returns {boolean}
 */
export const isProgrammer = (user) =>
  user && user.role === ROLES.PROGRAMMER

/**
 * @param {object} user - User object with optional .role
 * @returns {boolean}
 */
export const isAdmin = (user) =>
  user && user.role === ROLES.ADMIN

/**
 * @param {object} user - User object with optional .role
 * @param {string|string[]} roleOrRoles - Single role or array of allowed roles
 * @returns {boolean}
 */
export const hasRole = (user, roleOrRoles) => {
  if (!user) return false
  const allowed = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles]
  return allowed.includes(user.role)
}

/**
 * Display label for role (e.g. 'user' -> 'CLIENT').
 * @param {string} role
 * @returns {string}
 */
export const getRoleDisplayLabel = (role) => {
  if (role === ROLES.USER) return 'CLIENT'
  return role ? String(role).toUpperCase() : ''
}
