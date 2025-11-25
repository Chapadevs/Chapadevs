import { DataTypes } from 'sequelize'
import { sequelize } from '../config/database.js'

const Notification = sequelize.define('Notification', {
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
  type: {
    type: DataTypes.ENUM(
      'project_assigned',
      'project_updated',
      'project_completed',
      'project_accepted',
      'message_received',
      'system'
    ),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'notifications',
  timestamps: true
})

// Add indexes
Notification.addHook('afterSync', async () => {
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_user_id ON notifications(userId);
    CREATE INDEX IF NOT EXISTS idx_user_read ON notifications(userId, isRead);
    CREATE INDEX IF NOT EXISTS idx_project_id ON notifications(projectId);
    CREATE INDEX IF NOT EXISTS idx_created ON notifications(createdAt);
  `).catch(() => {}) // Ignore if indexes already exist
})

export default Notification


