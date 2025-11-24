// Set up all model associations
import User from '../models/User.js'
import Project from '../models/Project.js'
import ProjectNote from '../models/ProjectNote.js'
import AIPreview from '../models/AIPreview.js'
import Notification from '../models/Notification.js'
import SupportTicket from '../models/SupportTicket.js'

// ============================================
// Project Associations
// ============================================
Project.belongsTo(User, { 
  as: 'client', 
  foreignKey: 'clientId' 
})

Project.belongsTo(User, { 
  as: 'assignedProgrammer',
  foreignKey: 'assignedProgrammerId' 
})

Project.hasMany(ProjectNote, { 
  as: 'notes', 
  foreignKey: 'projectId' 
})

// ============================================
// ProjectNote Associations
// ============================================
ProjectNote.belongsTo(User, { 
  as: 'user', 
  foreignKey: 'userId' 
})

ProjectNote.belongsTo(Project, { 
  as: 'project', 
  foreignKey: 'projectId' 
})

// ============================================
// AIPreview Associations
// ============================================
User.hasMany(AIPreview, { foreignKey: 'userId', as: 'aiPreviews' })
AIPreview.belongsTo(User, { foreignKey: 'userId', as: 'user' })
AIPreview.belongsTo(Project, { foreignKey: 'projectId', as: 'project' })

// ============================================
// Notification Associations
// ============================================
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' })
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' })
Notification.belongsTo(Project, { foreignKey: 'projectId', as: 'project' })

// ============================================
// SupportTicket Associations
// ============================================
User.hasMany(SupportTicket, { foreignKey: 'userId', as: 'supportTickets' })
SupportTicket.belongsTo(User, { foreignKey: 'userId', as: 'user' })

export { User, Project, ProjectNote, AIPreview, Notification, SupportTicket }

