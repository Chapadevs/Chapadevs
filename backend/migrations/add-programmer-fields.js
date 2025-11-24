import { sequelize } from '../config/database.js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const addProgrammerFields = async () => {
  try {
    await sequelize.authenticate()
    console.log('✅ Connected to database')

    // Check if columns exist
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME IN ('skills', 'bio', 'hourlyRate')
    `)

    const existingColumns = results.map(r => r.COLUMN_NAME)
    const columnsToAdd = ['skills', 'bio', 'hourlyRate'].filter(col => !existingColumns.includes(col))

    if (columnsToAdd.length === 0) {
      console.log('✅ All programmer fields already exist')
      process.exit(0)
    }

    // Add missing columns
    for (const column of columnsToAdd) {
      if (column === 'skills') {
        await sequelize.query(`
          ALTER TABLE users 
          ADD COLUMN skills JSON NULL DEFAULT NULL
        `)
        console.log('✅ Added skills column')
      } else if (column === 'bio') {
        await sequelize.query(`
          ALTER TABLE users 
          ADD COLUMN bio TEXT NULL DEFAULT NULL
        `)
        console.log('✅ Added bio column')
      } else if (column === 'hourlyRate') {
        await sequelize.query(`
          ALTER TABLE users 
          ADD COLUMN hourlyRate DECIMAL(10, 2) NULL DEFAULT NULL
        `)
        console.log('✅ Added hourlyRate column')
      }
    }

    // Also check and update role enum if needed
    const [roleResults] = await sequelize.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'role'
    `)

    if (roleResults.length > 0) {
      const currentType = roleResults[0].COLUMN_TYPE
      // Check if it has the new 'user' value
      if (!currentType.includes("'user'")) {
        console.log('⚠️  Updating role enum to include "user"...')
        
        // First, alter the enum to include 'user' (MySQL will allow this)
        await sequelize.query(`
          ALTER TABLE users 
          MODIFY COLUMN role ENUM('client', 'user', 'programmer', 'admin') 
          NOT NULL 
          DEFAULT 'user'
        `)
        console.log('✅ Role enum extended')
        
        // Now update existing 'client' values to 'user'
        await sequelize.query(`
          UPDATE users 
          SET role = 'user' 
          WHERE role = 'client'
        `)
        console.log('✅ Updated client roles to user')
        
        // Finally, remove 'client' from enum
        await sequelize.query(`
          ALTER TABLE users 
          MODIFY COLUMN role ENUM('user', 'programmer', 'admin') 
          NOT NULL 
          DEFAULT 'user'
        `)
        console.log('✅ Role enum updated to final state')
      }
    }

    console.log('✅ Migration completed successfully')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error adding programmer fields:', error.message)
    console.error(error)
    process.exit(1)
  }
}

addProgrammerFields()

