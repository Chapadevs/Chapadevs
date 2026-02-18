import { WebSocketServer } from 'ws'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

class WebSocketService {
  constructor() {
    this.wss = null
    this.clients = new Map() // userId -> Set of WebSocket connections
    this.projectRooms = new Map() // projectId -> Set of userIds viewing the project
  }

  initialize(server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
      clientTracking: true
    })

    this.wss.on('connection', (ws, req) => {
      // Authenticate connection
      const token = this.extractToken(req)
      
      if (!token) {
        console.log('❌ WebSocket connection rejected: No token')
        ws.close(1008, 'Authentication required')
        return
      }

      this.authenticateConnection(ws, token)
    })

    console.log('✅ WebSocket server initialized')
  }

  extractToken(req) {
    // Try to get token from query string
    const url = new URL(req.url, `http://${req.headers.host}`)
    const token = url.searchParams.get('token')
    
    // Also try Authorization header if present
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization
      if (authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7)
      }
    }

    return token
  }

  async authenticateConnection(ws, token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.id).select('-password')

      if (!user) {
        console.log('❌ WebSocket connection rejected: User not found')
        ws.close(1008, 'User not found')
        return
      }

      // Store user info on WebSocket
      ws.userId = user._id.toString()
      ws.user = user

      // Add to clients map
      if (!this.clients.has(ws.userId)) {
        this.clients.set(ws.userId, new Set())
      }
      this.clients.get(ws.userId).add(ws)
      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'WebSocket connection established'
      }))

      // Handle messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString())
          this.handleMessage(ws, data)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      })

      // Handle disconnection
      ws.on('close', () => {
        this.handleDisconnection(ws)
      })

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error)
        this.handleDisconnection(ws)
      })

    } catch (error) {
      console.error('WebSocket authentication error:', error)
      ws.close(1008, 'Authentication failed')
    }
  }

  handleMessage(ws, data) {
    // Handle ping/pong for keepalive
    if (data.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' }))
      return
    }

    // Handle project room join/leave for chat
    if (data.type === 'join_project') {
      const projectId = data.projectId?.toString()
      if (projectId && ws.userId) {
        if (!this.projectRooms.has(projectId)) {
          this.projectRooms.set(projectId, new Set())
        }
        this.projectRooms.get(projectId).add(ws.userId)
        console.log(`User ${ws.userId} joined project room ${projectId}`)
      }
      return
    }

    if (data.type === 'leave_project') {
      const projectId = data.projectId?.toString()
      if (projectId && ws.userId) {
        const room = this.projectRooms.get(projectId)
        if (room) {
          room.delete(ws.userId)
          if (room.size === 0) {
            this.projectRooms.delete(projectId)
          }
        }
        console.log(`User ${ws.userId} left project room ${projectId}`)
      }
      return
    }
  }

  handleDisconnection(ws) {
    if (ws.userId) {
      const userClients = this.clients.get(ws.userId)
      if (userClients) {
        userClients.delete(ws)
        if (userClients.size === 0) {
          this.clients.delete(ws.userId)
          // Remove user from all project rooms
          this.projectRooms.forEach((room, projectId) => {
            room.delete(ws.userId)
            if (room.size === 0) {
              this.projectRooms.delete(projectId)
            }
          })
        }
      }
    }
  }

  // Broadcast notification to specific user
  broadcastToUser(userId, notification) {
    const userClients = this.clients.get(userId?.toString())
    
    if (!userClients || userClients.size === 0) {
      return false
    }

    const message = JSON.stringify({
      type: 'notification',
      data: notification
    })

    let sent = false
    userClients.forEach((ws) => {
      if (ws.readyState === 1) { // WebSocket.OPEN
        try {
          ws.send(message)
          sent = true
        } catch (error) {
          console.error('Error sending WebSocket message:', error)
        }
      }
    })

    return sent
  }

  // Broadcast notification count update
  broadcastUnreadCount(userId, count) {
    const userClients = this.clients.get(userId?.toString())
    
    if (!userClients || userClients.size === 0) {
      return false
    }

    const message = JSON.stringify({
      type: 'unread_count',
      count
    })

    let sent = false
    userClients.forEach((ws) => {
      if (ws.readyState === 1) { // WebSocket.OPEN
        try {
          ws.send(message)
          sent = true
        } catch (error) {
          console.error('Error sending WebSocket message:', error)
        }
      }
    })

    return sent
  }

  // Get number of connected clients for a user
  getClientCount(userId) {
    const userClients = this.clients.get(userId?.toString())
    return userClients ? userClients.size : 0
  }

  // Broadcast message to all users viewing a project
  broadcastToProject(projectId, message, excludeUserId = null) {
    const projectIdStr = projectId?.toString()
    const room = this.projectRooms.get(projectIdStr)
    
    if (!room || room.size === 0) {
      return false
    }

    const messageStr = JSON.stringify(message)
    let sent = false

    room.forEach((userId) => {
      if (excludeUserId && userId === excludeUserId.toString()) {
        return // Skip excluded user (usually the sender)
      }

      const userClients = this.clients.get(userId)
      if (userClients) {
        userClients.forEach((ws) => {
          if (ws.readyState === 1) { // WebSocket.OPEN
            try {
              ws.send(messageStr)
              sent = true
            } catch (error) {
              console.error('Error sending WebSocket message to project room:', error)
            }
          }
        })
      }
    })

    return sent
  }
}

// Export singleton instance
const websocketService = new WebSocketService()
export default websocketService
