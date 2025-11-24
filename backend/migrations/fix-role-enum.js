import { sequelize } from '../config/database.js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '..', '.env') })

const fixRoleEnum = async () => {
  try {
    await sequelize.authenticate()
    console.log('✅ Connected to database')

    const [roleResults] = await sequelize.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'role'
    `)

    if (roleResults.length === 0) {
      console.log('⚠️  Role column not found')
      process.exit(0)
    }

    const currentType = roleResults[0].COLUMN_TYPE
    console.log('Current role enum:', currentType)

    if (currentType.includes("'user'") && !currentType.includes("'client'")) {
      console.log('✅ Role enum already correct')
      process.exit(0)
    }

    // Step 1: Add 'user' to enum if it doesn't exist
    if (!currentType.includes("'user'")) {
      console.log('Step 1: Adding "user" to enum...')
      await sequelize.query(`
        ALTER TABLE users 
        MODIFY COLUMN role ENUM('client', 'user', 'programmer', 'admin') 
        NOT NULL 
        DEFAULT 'user'
      `)
      console.log('✅ Added "user" to enum')
    }

    // Step 2: Update existing 'client' values to 'user'
    console.log('Step 2: Updating client roles to user...')
    await sequelize.query(`
      UPDATE users 
      SET role = 'user' 
      WHERE role = 'client'
    `)
    console.log('✅ Updated client roles')

    // Step 3: Remove 'client' from enum
    console.log('Step 3: Removing "client" from enum...')
    await sequelize.query(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('user', 'programmer', 'admin') 
      NOT NULL 
      DEFAULT 'user'
    `)
    console.log('✅ Role enum fixed')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error fixing role enum:', error.message)
    console.error(error)
    process.exit(1)
  }
}

fixRoleEnum()

