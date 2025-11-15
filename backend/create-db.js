// Simple script to create database
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const createDatabase = async () => {
  try {
    // Connect to MySQL server (without database)
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      // Try to connect without password if empty
      authPlugins: {
        mysql_native_password: () => () => Buffer.from(process.env.DB_PASSWORD || '')
      }
    })

    // Create database
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'chapadevs_crm'}\``)
    console.log('✅ Database created successfully!')
    
    await connection.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('\n💡 Make sure:')
    console.log('   1. MySQL is running')
    console.log('   2. Password in .env is correct (or leave empty if no password)')
    process.exit(1)
  }
}

createDatabase()

