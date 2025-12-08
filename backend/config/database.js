import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Ensure .env is loaded from the backend directory (or root if you prefer)
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI

    if (!uri) {
      console.warn('⚠️ MONGO_URI is not defined in environment variables')
      return false
    }

    const dbName = process.env.DB_NAME || 'chapadevs_crm'

    await mongoose.connect(uri, {
      dbName,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })

    console.log('✅ MongoDB connected successfully')
    return true
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message)
    console.warn('⚠️ Server will continue without database connection')
    return false
  }
}

export { connectDB }
