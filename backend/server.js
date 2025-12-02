import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables FIRST, before any other imports
// We now keep .env inside the backend folder only
const backendEnvPath = path.join(__dirname, '.env')

if (existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath })
  console.log('📁 Loaded .env from backend folder')
} else {
  console.log('⚠️  No backend/.env file found (using environment variables or defaults)')
}

// Debug: Log what was loaded (mask secrets)
console.log('🔍 Environment variables loaded:')
console.log('  BACKEND_PORT:', process.env.BACKEND_PORT || 'NOT SET')
console.log('  FRONTEND_URL:', process.env.FRONTEND_URL || 'NOT SET')
console.log('  MONGO_URI:', process.env.MONGO_URI ? '***SET***' : 'NOT SET')
console.log('')

import { connectDB } from './config/database.js'
import { errorHandler, notFound } from './middleware/errorMiddleware.js'

// Import Routes
import authRoutes from './routes/authRoutes.js'
import userRoutes from './routes/userRoutes.js'
import projectRoutes from './routes/projectRoutes.js'
import assignmentRoutes from './routes/assignmentRoutes.js'
import dashboardRoutes from './routes/dashboardRoutes.js'
import aiPreviewRoutes from './routes/aiPreviewRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js'
import supportRoutes from './routes/supportRoutes.js'

// Connect to database
connectDB()

const app = express()

// Middleware
app.use(cors({
  // In production, set FRONTEND_URL env (e.g. https://chapadevs.github.io)
  // Locally, default to Vite dev server
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Chapadevs CRM API is running',
    timestamp: new Date().toISOString()
  })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/assignments', assignmentRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/ai-previews', aiPreviewRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/support', supportRoutes)

// Error handling middleware (must be last)
app.use(notFound)
app.use(errorHandler)

// Cloud Run sets PORT in the container; locally we can use BACKEND_PORT
// IMPORTANT: Always prioritize PORT so managed platforms (Cloud Run) work correctly.
const PORT = process.env.PORT || process.env.BACKEND_PORT || 3001

app.listen(PORT, '0.0.0.0', () => {
  console.log(
    `🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`
  )
})

