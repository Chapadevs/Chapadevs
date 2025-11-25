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
      throw new Error('MONGO_URI is not defined in environment variables')
    }

    const dbName = process.env.DB_NAME || 'chapadevs_crm'

    await mongoose.connect(uri, {
      dbName,
    })

    console.log('✅ MongoDB connected successfully')
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message)
    process.exit(1)
  }
}

export { connectDB }
