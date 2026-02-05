import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { chatAPI } from '../../../services/api'

export const useProjectChat = (projectId) => {
  const { isAuthenticated, user } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)

  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)

  // Connect to WebSocket for this project
  const connectWebSocket = useCallback(() => {
    if (!isAuthenticated || !user || !projectId) return

    const token = localStorage.getItem('token')
    if (!token) return

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close()
    }

    // Determine WebSocket URL
    const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api'
    let wsUrl = API_URL.replace('/api', '')
    if (wsUrl.startsWith('http://')) {
      wsUrl = wsUrl.replace('http://', 'ws://')
    } else if (wsUrl.startsWith('https://')) {
      wsUrl = wsUrl.replace('https://', 'wss://')
    } else if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
      wsUrl = `ws://${wsUrl}`
    }
    const wsPath = `${wsUrl}/ws?token=${token}`

    try {
      const ws = new WebSocket(wsPath)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('✅ Chat WebSocket connected')
        // Join project room
        if (projectId) {
          ws.send(JSON.stringify({
            type: 'join_project',
            projectId: projectId.toString()
          }))
        }
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === 'chat_message') {
            // New message received
            setMessages((prev) => {
              // Check if message already exists (avoid duplicates)
              const exists = prev.some(m => 
                (m._id || m.id) === (data.data._id || data.data.id)
              )
              if (exists) return prev
              return [...prev, data.data]
            })
          } else if (data.type === 'connected') {
            console.log('Chat WebSocket:', data.message)
          } else if (data.type === 'pong') {
            // Keepalive response
          }
        } catch (error) {
          console.error('Error parsing chat WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('Chat WebSocket error:', error)
      }

      ws.onclose = () => {
        console.log('🔌 Chat WebSocket disconnected')
        // Attempt to reconnect after delay
        if (isAuthenticated && projectId) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket()
          }, 3000)
        }
      }
    } catch (error) {
      console.error('Error creating chat WebSocket connection:', error)
    }
  }, [isAuthenticated, user, projectId])

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!projectId) return

    try {
      setLoading(true)
      setError(null)
      const data = await chatAPI.getMessages(projectId)
      setMessages(data || [])
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load messages')
      console.error('Error loading messages:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  // Send message
  const sendMessage = useCallback(async (content) => {
    if (!projectId || !content || !content.trim()) {
      return { success: false, error: 'Message content is required' }
    }

    try {
      setSending(true)
      setError(null)
      
      // Optimistically add message to state (will be replaced by server response via WebSocket)
      const tempMessage = {
        _id: `temp-${Date.now()}`,
        projectId,
        senderId: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        content: content.trim(),
        readBy: [user._id],
        createdAt: new Date(),
      }
      setMessages((prev) => [...prev, tempMessage])

      const message = await chatAPI.sendMessage(projectId, content.trim())
      
      // Remove temp message and add real one (or let WebSocket handle it)
      setMessages((prev) => {
        const filtered = prev.filter(m => m._id !== tempMessage._id)
        // Check if message already exists from WebSocket
        const exists = filtered.some(m => (m._id || m.id) === (message._id || message.id))
        return exists ? filtered : [...filtered, message]
      })

      return { success: true, message }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to send message')
      // Remove temp message on error
      setMessages((prev) => prev.filter(m => !m._id?.startsWith('temp-')))
      return { success: false, error: err.response?.data?.message || err.message || 'Failed to send message' }
    } finally {
      setSending(false)
    }
  }, [projectId, user])

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!projectId) return

    try {
      await chatAPI.markAsRead(projectId)
      // Update local state to mark messages as read
      setMessages((prev) => prev.map((msg) => {
        const userId = user?._id || user?.id
        if (userId && !msg.readBy?.includes(userId)) {
          return {
            ...msg,
            readBy: [...(msg.readBy || []), userId],
          }
        }
        return msg
      }))
    } catch (err) {
      console.error('Error marking messages as read:', err)
    }
  }, [projectId, user])

  // Load messages and connect WebSocket when projectId changes
  useEffect(() => {
    if (projectId && isAuthenticated) {
      loadMessages()
      connectWebSocket()
    }

    return () => {
      // Cleanup: leave project room and close WebSocket
      if (wsRef.current && projectId) {
        try {
          wsRef.current.send(JSON.stringify({
            type: 'leave_project',
            projectId: projectId.toString()
          }))
        } catch (error) {
          console.error('Error leaving project room:', error)
        }
        wsRef.current.close()
        wsRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
  }, [projectId, isAuthenticated, loadMessages, connectWebSocket])

  // Send ping to keep connection alive
  useEffect(() => {
    if (!isAuthenticated || !wsRef.current || !projectId) return

    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // Every 30 seconds

    return () => clearInterval(pingInterval)
  }, [isAuthenticated, projectId])

  return {
    messages,
    loading,
    error,
    sending,
    sendMessage,
    loadMessages,
    markAsRead,
  }
}
