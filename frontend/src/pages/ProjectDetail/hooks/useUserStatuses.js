import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { userAPI } from '../../../services/api'

export const useUserStatuses = (project) => {
  const { user } = useAuth()
  const [userStatuses, setUserStatuses] = useState({})

  const loadUserStatuses = useCallback(async () => {
    if (!project) return
    
    try {
      const userIds = []
      
      // Add client ID
      if (project.clientId) {
        const clientId = (project.clientId._id || project.clientId)?.toString()
        if (clientId) userIds.push(clientId)
      }
      
      // Add primary assigned programmer ID
      if (project.assignedProgrammerId) {
        const programmerId = (project.assignedProgrammerId._id || project.assignedProgrammerId)?.toString()
        if (programmerId) userIds.push(programmerId)
      }
      
      // Add all programmers from assignedProgrammerIds array
      if (project.assignedProgrammerIds && Array.isArray(project.assignedProgrammerIds)) {
        project.assignedProgrammerIds.forEach((programmer) => {
          const programmerId = (programmer._id || programmer)?.toString()
          if (programmerId && !userIds.includes(programmerId)) {
            userIds.push(programmerId)
          }
        })
      }
      
      if (userIds.length > 0) {
        const statuses = await userAPI.getUserStatuses(userIds)
        console.log('Loaded user statuses:', statuses) // Debug log
        setUserStatuses(statuses)
      }
    } catch (error) {
      console.error('Failed to load user statuses:', error)
    }
  }, [project])

  useEffect(() => {
    if (project && project._id) {
      loadUserStatuses()
    }
  }, [project?._id, loadUserStatuses])

  // Refresh statuses periodically and when tab becomes visible
  useEffect(() => {
    if (!project) return

    // Refresh statuses periodically (every 10 seconds)
    const statusInterval = setInterval(() => {
      loadUserStatuses()
    }, 10000)

    // Refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadUserStatuses()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(statusInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [project, loadUserStatuses])

  const getUserStatus = (userId) => {
    if (!userId) return { status: 'offline', icon: '○', label: 'Offline', color: '#9e9e9e' }
    const userIdStr = (userId._id || userId)?.toString()
    const currentUserIdStr = (user?._id || user?.id)?.toString()
    
    // For current user, check localStorage first (for immediate updates), then backend
    if (userIdStr === currentUserIdStr) {
      const localStatus = localStorage.getItem('userStatus')
      const backendStatus = userStatuses[userIdStr]?.status || user?.status
      const status = localStatus || backendStatus || 'online'
      const statusMap = {
        online: { icon: '●', label: 'Online', color: '#4caf50' },
        away: { icon: '○', label: 'Away', color: '#ff9800' },
        busy: { icon: '●', label: 'Busy', color: '#f44336' },
        offline: { icon: '○', label: 'Offline', color: '#9e9e9e' }
      }
      return { status, ...statusMap[status] }
    }
    
    // For other users, get from backend statuses
    const userStatus = userStatuses[userIdStr]?.status || userId.status || 'offline'
    const statusMap = {
      online: { icon: '●', label: 'Online', color: '#4caf50' },
      away: { icon: '○', label: 'Away', color: '#ff9800' },
      busy: { icon: '●', label: 'Busy', color: '#f44336' },
      offline: { icon: '○', label: 'Offline', color: '#9e9e9e' }
    }
    return { status: userStatus, ...statusMap[userStatus] }
  }

  return {
    userStatuses,
    loadUserStatuses,
    getUserStatus,
  }
}
