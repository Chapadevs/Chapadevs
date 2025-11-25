import { DataTypes } from 'sequelize'
import { sequelize } from '../config/database.js'

const SupportTicket = sequelize.define('SupportTicket', {
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
  subject: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('technical', 'billing', 'general', 'feature_request', 'bug'),
    defaultValue: 'general'
  },
  status: {
    type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'closed'),
    defaultValue: 'open'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  adminResponse: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'support_tickets',
  timestamps: true
})

// Add indexes
SupportTicket.addHook('afterSync', async () => {
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_user_id ON support_tickets(userId);
    CREATE INDEX IF NOT EXISTS idx_status ON support_tickets(status);
    CREATE INDEX IF NOT EXISTS idx_created ON support_tickets(createdAt);
  `).catch(() => {}) // Ignore if indexes already exist
})

export default SupportTicket


