import { sequelize } from '../config/database.js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const updateProjectStatus = async () => {
  try {
    await sequelize.authenticate()
    console.log('✅ Connected to database')

    // Check current status column type
    const [results] = await sequelize.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'projects' 
      AND COLUMN_NAME = 'status'
    `)

    if (results.length === 0) {
      console.log('⚠️  Status column does not exist in projects table')
      process.exit(0)
    }

    const currentType = results[0].COLUMN_TYPE
    console.log('Current status type:', currentType)

    // Check if it already has the new values
    if (currentType.includes("'Holding'") && currentType.includes("'Ready'") && currentType.includes("'Development'")) {
      console.log('✅ Project status enum already updated')
      process.exit(0)
    }

    // Update existing status values to new values
    // Map old values to new values
    await sequelize.query(`
      UPDATE projects 
      SET status = CASE 
        WHEN status = 'draft' THEN 'Holding'
        WHEN status = 'pending' THEN 'Ready'
        WHEN status = 'in-progress' THEN 'Development'
        ELSE status
      END
    `)

    // Alter the column to use new ENUM values
    await sequelize.query(`
      ALTER TABLE projects 
      MODIFY COLUMN status ENUM('Holding', 'Ready', 'Development', 'Completed', 'Cancelled') 
      NOT NULL 
      DEFAULT 'Holding'
    `)

    console.log('✅ Project status enum updated successfully')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error updating project status:', error.message)
    console.error(error)
    process.exit(1)
  }
}

updateProjectStatus()


