import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Check if user is logged in on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token')
      const storedUser = localStorage.getItem('user')

      if (token && storedUser) {
        try {
          // Verify token is still valid by fetching user data
          const userData = await authAPI.getMe()
          setUser(userData)
          localStorage.setItem('user', JSON.stringify(userData))
        } catch (err) {
          // Token invalid, clear storage
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setUser(null)
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  const login = async (email, password) => {
    try {
      setError(null)
      setLoading(true)
      const data = await authAPI.login(email, password)
      
      // Store token and user data
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data))
      setUser(data)
      
      return { success: true }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Login failed'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const register = async (userData) => {
    try {
      setError(null)
      setLoading(true)
      const data = await authAPI.register(userData)
      
      // No token on register – user must verify email first, then log in
      if (data.token) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data))
        setUser(data)
      }
      
      return { success: true, email: data.email, message: data.message }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Registration failed'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      // Call logout API to set status to offline
      await authAPI.logout()
    } catch (error) {
      // Even if API call fails, continue with local logout
      console.error('Logout API error:', error)
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
      setError(null)
    }
  }

  const updateProfile = async (userData) => {
    try {
      setError(null)
      setLoading(true)
      const updatedUser = await authAPI.updateProfile(userData)
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
      return { success: true }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Profile update failed'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const changePassword = async (currentPassword, newPassword) => {
    try {
      setError(null)
      setLoading(true)
      await authAPI.changePassword(currentPassword, newPassword)
      return { success: true }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Password change failed'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

