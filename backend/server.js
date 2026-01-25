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

// Debug: Log what was loaded (mask password)
console.log('🔍 Environment variables loaded:')
console.log('  DB_HOST:', process.env.DB_HOST || 'NOT SET')
console.log('  DB_PORT:', process.env.DB_PORT || 'NOT SET')
console.log('  DB_NAME:', process.env.DB_NAME || 'NOT SET')
console.log('  DB_USER:', process.env.DB_USER || 'NOT SET')
console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET')
console.log('')

import { connectDB } from './config/database.js'
import { errorHandler, notFound } from './middleware/errorMiddleware.js'

// Import Routes
import authRoutes from './routes/authRoutes.js'
import userRoutes from './routes/userRoutes.js'
import projectRoutes from './routes/projectRoutes.js'
import assignmentRoutes from './routes/assignmentRoutes.js'
import aiPreviewRoutes from './routes/aiPreviewRoutes.js'

// Connect to database (non-blocking - server will start even if DB connection fails)
connectDB().then((connected) => {
  if (!connected) {
    console.warn('⚠️ Server started without database connection. Some features may not work.')
  }
}).catch((error) => {
  console.error('⚠️ Database connection attempt failed:', error.message)
})

const app = express()

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

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
    const vertexAIService = (await import('./services/vertexAIService.js')).default
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
app.use('/api/projects', projectRoutes)
app.use('/api/assignments', assignmentRoutes)
app.use('/api/ai-previews', aiPreviewRoutes)

// Error handling middleware (must be last)
app.use(notFound)
app.use(errorHandler)

// Cloud Run sets PORT environment variable automatically, default to 3001 for local development
const PORT = process.env.PORT || 3001

// Start server with error handling
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`)
  console.log(`📡 Health check available at http://0.0.0.0:${PORT}/health`)
  console.log(`📡 API health check at http://0.0.0.0:${PORT}/api/health`)
})

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error)
  if (error.code === 'EADDRINUSE') {
    console.error(`   Port ${PORT} is already in use`)
  }
  process.exit(1)
})

// Graceful shutdown for Cloud Run
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

// Handle uncaught errors to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  // Don't exit - let the server keep running
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  // Don't exit - let the server keep running
})

