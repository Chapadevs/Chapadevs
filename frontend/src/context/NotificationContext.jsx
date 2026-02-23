import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import { notificationAPI } from '../services/api'

const NotificationContext = createContext()

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

function getWsUrl() {
  const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api'
  let url = API_URL.replace('/api', '')
  if (url.startsWith('http://')) url = url.replace('http://', 'ws://')
  else if (url.startsWith('https://')) url = url.replace('https://', 'wss://')
  else if (!url.startsWith('ws')) url = `ws://${url}`
  return url
}

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const pollingIntervalRef = useRef(null)
  const isPollingRef = useRef(false)

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const data = await notificationAPI.getAll()
      setNotifications(data)
    } catch (err) {
      console.error('Error loading notifications:', err)
    }
  }, [isAuthenticated])

  const loadUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const data = await notificationAPI.getUnreadCount()
      setUnreadCount(data.unreadCount || 0)
    } catch (err) {
      console.error('Error loading unread count:', err)
    }
  }, [isAuthenticated])

  const startPolling = useCallback(() => {
    if (isPollingRef.current) return
    isPollingRef.current = true
    loadNotifications()
    loadUnreadCount()
    pollingIntervalRef.current = setInterval(() => {
      if (isAuthenticated) {
        loadUnreadCount()
        if (!document.hidden) loadNotifications()
      }
    }, 30000)
  }, [isAuthenticated, loadNotifications, loadUnreadCount])

  const connectWebSocket = useCallback(() => {
    if (!isAuthenticated || !user) return
    const token = localStorage.getItem('token')
    if (!token) return

    if (wsRef.current) wsRef.current.close()

    try {
      const ws = new WebSocket(`${getWsUrl()}/ws?token=${token}`)
      wsRef.current = ws

      ws.onopen = () => {
        isPollingRef.current = false
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
        loadNotifications()
        loadUnreadCount()
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'notification') {
            setNotifications((prev) => [data.data, ...prev])
            setUnreadCount((prev) => prev + 1)
          } else if (data.type === 'unread_count') {
            setUnreadCount(data.count)
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err)
        }
      }

      ws.onerror = () => {
        if (!isPollingRef.current) startPolling()
      }

      ws.onclose = () => {
        if (isAuthenticated) {
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000)
        }
        if (!isPollingRef.current) startPolling()
      }
    } catch (err) {
      console.error('Error creating WebSocket connection:', err)
      if (!isPollingRef.current) startPolling()
    }
  }, [isAuthenticated, user, loadNotifications, loadUnreadCount, startPolling])

  const markAsRead = useCallback(async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      
      // Use functional update to ensure we have the latest state
      setNotifications((prev) =>
        prev.map((notif) =>
          // Ensure we compare strings to avoid ID type mismatches
          String(notif._id || notif.id) === String(id)
            ? { ...notif, isRead: true, readAt: new Date() }
            : notif
        )
      );

      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
      throw err;
    }
  }, []); // Dependencies removed because we use functional updates

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationAPI.markAllAsRead()
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true, readAt: new Date() }))
      )
      setUnreadCount(0)
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
      throw err
    }
  }, [])

  // Mark multiple notifications as read by id (e.g. all for a project or for a tab)
  const markNotificationsAsRead = useCallback(async (notificationIds) => {
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) return
    const ids = notificationIds.map((id) => String(id))
    try {
      await Promise.all(ids.map((id) => notificationAPI.markAsRead(id)))
      setNotifications((prev) =>
        prev.map((notif) =>
          ids.includes(String(notif._id || notif.id))
            ? { ...notif, isRead: true, readAt: new Date() }
            : notif
        )
      )
      loadUnreadCount()
    } catch (err) {
      console.error('Error marking notifications as read:', err)
    }
  }, [loadUnreadCount])

  // Delete notification
  const deleteNotification = useCallback(async (id) => {
    try {
      await notificationAPI.delete(id);
      
      setNotifications((prev) => {
        // Find the notification in the PREVIOUS state to check if it was unread
        const target = prev.find(n => String(n._id || n.id) === String(id));
        
        if (target && !target.isRead) {
          setUnreadCount((count) => Math.max(0, count - 1));
        }
        
        return prev.filter((notif) => String(notif._id || notif.id) !== String(id));
      });
    } catch (err) {
      console.error('Error deleting notification:', err);
      throw err;
    }
  }, []);

  // Initialize on mount and when auth changes
  useEffect(() => {
    if (isAuthenticated && user) {
      connectWebSocket()
    } else {
      // Cleanup when not authenticated
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      setNotifications([])
      setUnreadCount(0)
      isPollingRef.current = false
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [isAuthenticated, user, connectWebSocket])

  // Send ping to keep connection alive
  useEffect(() => {
    if (!isAuthenticated || !wsRef.current) return

    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // Every 30 seconds

    return () => clearInterval(pingInterval)
  }, [isAuthenticated])

  const value = {
    notifications,
    unreadCount,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    markNotificationsAsRead,
    deleteNotification,
    hasUnread: unreadCount > 0,
  }

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}
