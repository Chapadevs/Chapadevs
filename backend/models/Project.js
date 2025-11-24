import { DataTypes } from 'sequelize'
import { sequelize } from '../config/database.js'

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Please add a project title' }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Please add a project description' }
    }
  },
  clientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  assignedProgrammerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  status: {
    type: DataTypes.ENUM('Holding', 'Ready', 'Development', 'Completed', 'Cancelled'),
    defaultValue: 'Holding'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  projectType: {
    type: DataTypes.ENUM(
      'New Website Design & Development',
      'Website Redesign/Refresh',
      'E-commerce Store',
      'Landing Page',
      'Web Application',
      'Maintenance/Updates to Existing Site',
      'Other'
    ),
    allowNull: true
  },
  budget: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  timeline: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  goals: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  features: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  designStyles: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  technologies: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  hasBranding: {
    type: DataTypes.ENUM('Yes', 'No', 'Partial'),
    allowNull: true
  },
  brandingDetails: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  contentStatus: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  referenceWebsites: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  specialRequirements: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  additionalComments: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completedDate: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'projects',
  timestamps: true
})

// Define associations (will be set up after User model is loaded)
// This is done in a separate step to avoid circular dependencies

// Add indexes
Project.addHook('afterSync', async () => {
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_client ON projects(clientId);
    CREATE INDEX IF NOT EXISTS idx_programmer ON projects(assignedProgrammerId);
    CREATE INDEX IF NOT EXISTS idx_status ON projects(status);
    CREATE INDEX IF NOT EXISTS idx_client_status ON projects(clientId, status);
    CREATE INDEX IF NOT EXISTS idx_programmer_status ON projects(assignedProgrammerId, status);
    CREATE INDEX IF NOT EXISTS idx_created ON projects(createdAt);
  `).catch(() => {}) // Ignore if indexes already exist
})

export default Project
