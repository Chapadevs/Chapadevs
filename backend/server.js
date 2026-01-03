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

// Cloud Run sets PORT environment variable automatically, default to 3001 for local development
const PORT = process.env.PORT || 3001

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`)
})

