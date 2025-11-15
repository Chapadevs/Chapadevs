// Test MySQL connection with different password scenarios
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

console.log('Testing MySQL connection...')
console.log('DB_USER:', process.env.DB_USER)
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : '(empty)')
console.log('DB_HOST:', process.env.DB_HOST)
console.log('DB_PORT:', process.env.DB_PORT)
console.log('DB_NAME:', process.env.DB_NAME)
console.log('')

// Test 1: With password from .env
console.log('Test 1: Connecting with password from .env...')
try {
  const connection1 = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  })
  console.log('✅ Test 1 SUCCESS: Connection with .env password works!')
  await connection1.end()
} catch (error) {
  console.log('❌ Test 1 FAILED:', error.message)
}

console.log('')

// Test 2: Without password (empty string)
console.log('Test 2: Connecting without password (empty string)...')
try {
  const connection2 = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: ''
  })
  console.log('✅ Test 2 SUCCESS: Connection without password works!')
  await connection2.end()
} catch (error) {
  console.log('❌ Test 2 FAILED:', error.message)
}

console.log('')

// Test 3: Without password field (undefined)
console.log('Test 3: Connecting without password field...')
try {
  const connection3 = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root'
  })
  console.log('✅ Test 3 SUCCESS: Connection without password field works!')
  await connection3.end()
} catch (error) {
  console.log('❌ Test 3 FAILED:', error.message)
}

process.exit(0)

