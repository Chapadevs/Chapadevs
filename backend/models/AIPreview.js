import { DataTypes } from 'sequelize'
import { sequelize } from '../config/database.js'

const AIPreview = sequelize.define('AIPreview', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'projects',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  prompt: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  previewResult: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  previewType: {
    type: DataTypes.ENUM('text', 'layout', 'design'),
    defaultValue: 'text'
  },
  status: {
    type: DataTypes.ENUM('generating', 'completed', 'failed'),
    defaultValue: 'generating'
  }
}, {
  tableName: 'ai_previews',
  timestamps: true
})

// Add indexes
AIPreview.addHook('afterSync', async () => {
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_user_id ON ai_previews(userId);
    CREATE INDEX IF NOT EXISTS idx_project_id ON ai_previews(projectId);
    CREATE INDEX IF NOT EXISTS idx_created ON ai_previews(createdAt);
  `).catch(() => {}) // Ignore if indexes already exist
})

export default AIPreview


