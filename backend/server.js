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

// Connect to database (non-blocking for Cloud Run)
// Server must start listening immediately for health checks
connectDB().catch(err => {
  console.error('⚠️  Initial DB connection failed, but server will start:', err.message)
  console.log('🔄 Database connection will be retried when requests come in...')
})

const app = express()

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

// Error handling middleware (must be last)
app.use(notFound)
app.use(errorHandler)

// Cloud Run sets PORT environment variable, default to 5000 for local development
const PORT = process.env.PORT || 5000

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`)
})

