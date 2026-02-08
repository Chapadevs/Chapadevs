import { ROLES } from './roles'

/**
 * Per-role config for Dashboard: title, links, and whether to show AI usage section.
 */
export const DASHBOARD_ROLE_CONFIG = {
  [ROLES.ADMIN]: {
    title: 'Projects',
    links: [
      { to: '/projects', label: 'View All Projects' },
      { to: '/assignments', label: 'Manage Assignments' },
    ],
    showAiUsage: false,
  },
  [ROLES.PROGRAMMER]: {
    title: 'Projects',
    links: [
      { to: '/projects', label: 'My Projects' },
      { to: '/assignments', label: 'Explore Projects' },
    ],
    showAiUsage: false,
  },
  [ROLES.CLIENT]: {
    title: 'Projects',
    links: [{ to: '/projects', label: 'My Projects' }],
    showAiUsage: true,
  },
  [ROLES.USER]: {
    title: 'Projects',
    links: [{ to: '/projects', label: 'My Projects' }],
    showAiUsage: true,
  },
}

/**
 * Resolve dashboard config for current role. Treats 'user' as client.
 * @param {string} role
 * @returns {object} { title, links, showAiUsage }
 */
export const getDashboardConfigForRole = (role) => {
  const key = role === ROLES.USER ? ROLES.CLIENT : role
  return DASHBOARD_ROLE_CONFIG[key] ?? DASHBOARD_ROLE_CONFIG[ROLES.CLIENT]
}
