import { isClient, isProgrammer } from './roles'

/**
 * Load projects for the current user based on role.
 * Client/user -> getMyProjects, programmer -> getAssignedProjects, admin -> getAll.
 * @param {object} projectAPI - projectAPI from services/api
 * @param {object} user - current user with .role
 * @returns {Promise<object[]>} list of projects
 */
export async function loadProjectsForRole(projectAPI, user) {
  if (!user) return []
  if (isClient(user)) return projectAPI.getMyProjects()
  if (isProgrammer(user)) return projectAPI.getAssignedProjects()
  return projectAPI.getAll()
}
