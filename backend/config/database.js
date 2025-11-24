import { Sequelize } from 'sequelize'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Ensure .env is loaded from the backend directory
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const sequelize = new Sequelize(
  process.env.DB_NAME || 'chapadevs_crm',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'root',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: false,
    }
  }
)

const connectDB = async () => {
  try {
    await sequelize.authenticate()
    console.log('✅ MySQL Connected successfully')
    
    // Import and set up associations
    await import('./associations.js')
    
    // Sync models (set to false in production, use migrations instead)
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: false }) // Set to true to auto-update schema
      console.log('✅ Database models synchronized')
    }
  } catch (error) {
    console.error('❌ Error connecting to MySQL:', error.message)
    process.exit(1)
  }
}

export { sequelize, connectDB }
