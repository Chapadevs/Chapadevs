// Centralized model exports
import User from './User.js'
import Project from './Project.js'
import ProjectNote from './ProjectNote.js'

// Import associations after models are defined
import './Project.js' // This will set up Project associations
import './ProjectNote.js' // This will set up ProjectNote associations

export { User, Project, ProjectNote }

