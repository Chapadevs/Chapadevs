import { DataTypes } from 'sequelize'
import { sequelize } from '../config/database.js'

const ProjectNote = sequelize.define('ProjectNote', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'projects',
      key: 'id'
    },
    onDelete: 'CASCADE'
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
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: 'project_notes',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false // Notes don't get updated
})

// Define associations (will be set up after models are loaded)

// Add indexes
ProjectNote.addHook('afterSync', async () => {
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_project ON project_notes(projectId);
    CREATE INDEX IF NOT EXISTS idx_user ON project_notes(userId);
    CREATE INDEX IF NOT EXISTS idx_created ON project_notes(createdAt);
  `).catch(() => {})
})

export default ProjectNote

