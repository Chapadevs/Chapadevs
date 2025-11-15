// Debug script to check if .env is being loaded
import dotenv from 'dotenv'

console.log('=== DEBUG: Environment Variables ===')
console.log('')

// Load .env
const result = dotenv.config()

if (result.error) {
  console.error('❌ Error loading .env:', result.error)
} else {
  console.log('✅ .env file loaded successfully')
  console.log('')
}

console.log('DB_HOST:', process.env.DB_HOST)
console.log('DB_PORT:', process.env.DB_PORT)
console.log('DB_NAME:', process.env.DB_NAME)
console.log('DB_USER:', process.env.DB_USER)
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? `"${process.env.DB_PASSWORD}" (length: ${process.env.DB_PASSWORD.length})` : 'UNDEFINED or EMPTY')
console.log('')

// Test what Sequelize would receive
console.log('=== What Sequelize would receive ===')
console.log('Username:', process.env.DB_USER || 'root')
console.log('Password:', process.env.DB_PASSWORD || '')
console.log('Password type:', typeof (process.env.DB_PASSWORD || ''))
console.log('Password is empty?', !process.env.DB_PASSWORD || process.env.DB_PASSWORD === '')

