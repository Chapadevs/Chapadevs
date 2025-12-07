import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Ensure .env is loaded from the backend directory (or root if you prefer)
dotenv.config({ path: path.join(__dirname, '..', '.env') })

let isConnecting = false

const connectDB = async () => {
  // Prevent multiple simultaneous connection attempts
  if (isConnecting) {
    return
  }

  // If already connected, return
  if (mongoose.connection.readyState === 1) {
    return
  }

  try {
    isConnecting = true
    const uri = process.env.MONGO_URI

    if (!uri) {
      throw new Error('MONGO_URI is not defined in environment variables')
    }

    const dbName = process.env.DB_NAME || 'chapadevs_crm'

    await mongoose.connect(uri, {
      dbName,
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
    })

    console.log('✅ MongoDB connected successfully')
    isConnecting = false
  } catch (error) {
    isConnecting = false
    console.error('❌ Error connecting to MongoDB:', error.message)
    // Don't exit - let the server start and retry connection
    // Cloud Run needs the container to listen on the port
    console.log('⚠️  Server will start without database connection. Retrying in background...')
    
    // Retry connection after 5 seconds (only if not already connected)
    setTimeout(() => {
      if (mongoose.connection.readyState !== 1) {
        connectDB().catch(err => {
          console.error('❌ Retry failed:', err.message)
        })
      }
    }, 5000)
  }
}

export { connectDB }
