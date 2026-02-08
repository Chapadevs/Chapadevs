import { useAuth } from '../context/AuthContext'
import { isClient, isProgrammer, isAdmin, hasRole as checkHasRole } from '../config/roles'

/**
 * Hook that provides current user and role-derived booleans.
 * Use instead of repeating user?.role === '...' in components.
 */
export function useRole() {
  const { user } = useAuth()
  return {
    user,
    role: user?.role,
    isClient: isClient(user),
    isProgrammer: isProgrammer(user),
    isAdmin: isAdmin(user),
    hasRole: (roleOrRoles) => checkHasRole(user, roleOrRoles),
  }
}
