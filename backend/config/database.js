import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Ensure .env is loaded from the backend directory (or root if you prefer)
dotenv.config({ path: path.join(__dirname, '..', '.env') })

let isConnecting = false
let connectionPromise = null

// Set up connection event handlers for automatic reconnection
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB')
  isConnecting = false
  connectionPromise = null
})

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err.message)
  isConnecting = false
  connectionPromise = null
})

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  Mongoose disconnected from MongoDB')
  isConnecting = false
  connectionPromise = null
})

const connectDB = async () => {
  // If already connected, return
  if (mongoose.connection.readyState === 1) {
    return
  }

  // If currently connecting, return the existing promise
  if (isConnecting && connectionPromise) {
    return connectionPromise
  }

  try {
    isConnecting = true
    const uri = process.env.MONGO_URI

    if (!uri) {
      throw new Error('MONGO_URI is not defined in environment variables')
    }

    const dbName = process.env.DB_NAME || 'chapadevs_crm'

    // Create connection with proper timeout settings
    connectionPromise = mongoose.connect(uri, {
      dbName,
      serverSelectionTimeoutMS: 30000, // 30 seconds timeout (increased for Cloud Run)
      socketTimeoutMS: 45000, // 45 seconds socket timeout
      connectTimeoutMS: 30000, // 30 seconds connection timeout
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 2, // Maintain at least 2 socket connections
      retryWrites: true,
      w: 'majority',
    })

    await connectionPromise

    console.log('✅ MongoDB connected successfully')
    isConnecting = false
    connectionPromise = null
  } catch (error) {
    isConnecting = false
    connectionPromise = null
    console.error('❌ Error connecting to MongoDB:', error.message)
    // Don't exit process in Cloud Run - let it retry
    // Only exit in development if explicitly needed
    if (process.env.NODE_ENV === 'development' && process.env.EXIT_ON_DB_ERROR === 'true') {
      process.exit(1)
    }
    throw error
  }
}

// Helper function to ensure DB is connected before operations
export const ensureConnection = async () => {
  if (mongoose.connection.readyState === 1) {
    return true
  }

  if (mongoose.connection.readyState === 2) {
    // Connecting - wait for it
    if (connectionPromise) {
      await connectionPromise
      return mongoose.connection.readyState === 1
    }
  }

  // Not connected - try to connect
  try {
    await connectDB()
    return mongoose.connection.readyState === 1
  } catch (error) {
    return false
  }
}

export { connectDB }
