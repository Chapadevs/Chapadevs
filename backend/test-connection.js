// Test MySQL connection with password
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const testConnection = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: 'root'
    })

    console.log('✅ Connection successful! Password works!')
    await connection.end()
    process.exit(0)
  } catch (error) {
    console.log('❌ Connection failed:', error.message)
    process.exit(1)
  }
}

testConnection()

