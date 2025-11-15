// Set up all model associations
import User from '../models/User.js'
import Project from '../models/Project.js'
import ProjectNote from '../models/ProjectNote.js'

// Project associations
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

// ProjectNote associations
ProjectNote.belongsTo(User, { 
  as: 'user', 
  foreignKey: 'userId' 
})

ProjectNote.belongsTo(Project, { 
  as: 'project', 
  foreignKey: 'projectId' 
})

export { User, Project, ProjectNote }

