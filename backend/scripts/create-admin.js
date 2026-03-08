/**
 * One-off script to promote a user to admin by email.
 * Run from backend directory: node scripts/create-admin.js <email>
 * Or set ADMIN_EMAIL env var: ADMIN_EMAIL=admin@example.com node scripts/create-admin.js
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import { connectDB } from '../config/database.js'
import User from '../models/User.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '..', '.env') })

const email = process.argv[2] || process.env.ADMIN_EMAIL

if (!email) {
  console.error('Usage: node scripts/create-admin.js <email>')
  console.error('   Or: ADMIN_EMAIL=admin@example.com node scripts/create-admin.js')
  process.exit(1)
}

const run = async () => {
  const connected = await connectDB()
  if (!connected) {
    process.exit(1)
  }

  try {
    const user = await User.findOne({ email: email.trim() })
    if (!user) {
      console.error(`User not found with email: ${email}`)
      process.exit(1)
    }

    if (user.role === 'admin') {
      console.log(`User ${email} is already an admin.`)
      await mongoose.disconnect()
      process.exit(0)
    }

    user.role = 'admin'
    await user.save()
    console.log(`✅ User ${email} promoted to admin.`)
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

run()
