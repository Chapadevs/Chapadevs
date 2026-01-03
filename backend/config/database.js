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
      console.error('❌ MONGO_URI is not defined in environment variables')
      console.error('   Please set MONGO_URI in Cloud Run environment variables or GitHub secrets')
      return false
    }

    const dbName = process.env.DB_NAME || 'chapadevs_crm'

    console.log('🔄 Attempting to connect to MongoDB...')
    await mongoose.connect(uri, {
      dbName,
      serverSelectionTimeoutMS: 10000, // Increased to 10 seconds
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    })

    console.log('✅ MongoDB connected successfully')
    console.log(`   Database: ${dbName}`)
    return true
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message)
    console.error('   Check that MONGO_URI is correct and MongoDB is accessible')
    console.warn('⚠️ Server will continue without database connection')
    return false
  }
}

export { connectDB }
