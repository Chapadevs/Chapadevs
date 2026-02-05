import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables FIRST, before any other imports
// Explicitly point to the .env file in the backend directory
dotenv.config({ path: path.join(__dirname, '.env') })

// Debug: Log what was loaded (mask secrets)
console.log('🔍 Environment variables loaded:')
console.log('  MONGO_URI:', process.env.MONGO_URI ? '***SET***' : 'NOT SET')
console.log('  DB_NAME:', process.env.DB_NAME || 'NOT SET')
console.log('  GCP_PROJECT_ID:', process.env.GCP_PROJECT_ID || 'NOT SET')
console.log('  JWT_SECRET:', process.env.JWT_SECRET ? '***SET***' : 'NOT SET')
console.log('  FRONTEND_URL:', process.env.FRONTEND_URL || 'NOT SET')
console.log('')

import { connectDB } from './config/database.js'
import { errorHandler, notFound } from './middleware/errorMiddleware.js'
import websocketService from './services/websocket.js'

// Import Routes
import authRoutes from './routes/authRoutes.js'
import userRoutes from './routes/userRoutes.js'
import chatRoutes from './routes/chatRoutes.js'
import projectRoutes from './routes/projectRoutes.js'
import assignmentRoutes from './routes/assignmentRoutes.js'
import aiPreviewRoutes from './routes/aiPreviewRoutes.js'
import inquiryRoutes from './routes/inquiryRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js'

const app = express()

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Health check routes (Cloud Run checks root /health)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString()
  })
})

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Chapadevs CRM API is running',
    timestamp: new Date().toISOString()
  })
})

// Vertex AI status endpoint - Check if Vertex AI is working
app.get('/api/vertex-ai/status', async (req, res) => {
  try {
    const vertexAIService = (await import('./services/vertexAI/index.js')).default
    const status = vertexAIService.checkVertexAIStatus()
    res.status(200).json({
      ...status,
      warning: !status.initialized ? 'Vertex AI is NOT working - using mock data' : null,
      message: status.initialized 
        ? 'Vertex AI is properly configured and ready' 
        : 'Vertex AI is NOT initialized - all requests will use mock data (no billing charges)'
    })
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to check Vertex AI status',
      message: error.message 
    })
  }
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/projects', chatRoutes) // Chat routes must come before project routes
app.use('/api/projects', projectRoutes)
app.use('/api/assignments', assignmentRoutes)
app.use('/api/ai-previews', aiPreviewRoutes)
app.use('/api/inquiry', inquiryRoutes)
app.use('/api/notifications', notificationRoutes)

// Error handling middleware (must be last)
app.use(notFound)
app.use(errorHandler)

// Cloud Run sets PORT environment variable automatically, default to 3001 for local development
const PORT = process.env.PORT || 3001

// Wait for MongoDB before accepting traffic (fixes 503 on login during cold start)
async function start() {
  let connected = false
  try {
    connected = await connectDB()
  } catch (error) {
    console.error('⚠️ Database connection attempt failed:', error.message)
  }
  if (!connected) {
    console.warn('⚠️ Server starting without database connection. Auth/protected routes will return 503.')
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`)
    console.log(`📡 Health check available at http://0.0.0.0:${PORT}/health`)
    console.log(`📡 API health check at http://0.0.0.0:${PORT}/api/health`)
    
    // Initialize WebSocket server
    websocketService.initialize(server)
    console.log(`🔌 WebSocket server available at ws://0.0.0.0:${PORT}/ws`)
  })

  server.on('error', (error) => {
    console.error('❌ Server error:', error)
    if (error.code === 'EADDRINUSE') {
      console.error(`   Port ${PORT} is already in use`)
    }
    process.exit(1)
  })

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...')
    server.close(() => {
      console.log('Server closed')
      process.exit(0)
    })
  })
}// Handle uncaught errors to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  // Don't exit - let the server keep running
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  // Don't exit - let the server keep running
})

start()