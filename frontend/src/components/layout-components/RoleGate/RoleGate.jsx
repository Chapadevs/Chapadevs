import { useRole } from '../../../hooks/useRole'

/**
 * Renders children only when the current user has one of the allowed roles.
 * @param {object} props
 * @param {string[]} props.allow - Array of role strings (e.g. ['admin'], ['client', 'user'])
 * @param {React.ReactNode} [props.fallback] - Optional content when role check fails
 * @param {React.ReactNode} props.children
 */
const RoleGate = ({ allow = [], fallback = null, children }) => {
  const { hasRole } = useRole()
  if (!allow.length || hasRole(allow)) {
    return children
  }
  return fallback
}

export default RoleGate
