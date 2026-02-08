import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { hasRole } from '../../../config/roles'

const RoleProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles.length > 0 && !hasRole(user, allowedRoles)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default RoleProtectedRoute



