import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// Protect routes - verify JWT token
export const protect = async (req, res, next) => {
  let token

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1]

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      // Get user from token (excluding password)
      req.user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      })

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' })
      }

      if (!req.user.isActive) {
        return res.status(401).json({ message: 'User account is deactivated' })
      }

      next()
    } catch (error) {
      console.error('Token verification error:', error)
      return res.status(401).json({ message: 'Not authorized, token failed' })
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' })
  }
}

// Role-based authorization
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role '${req.user.role}' is not authorized to access this route`,
      })
    }
    next()
  }
}

// Check if user owns the resource or is a programmer/admin
export const authorizeProjectAccess = async (req, res, next) => {
  try {
    const Project = (await import('../models/Project.js')).default
    const project = await Project.findByPk(req.params.id)

    if (!project) {
      return res.status(404).json({ message: 'Project not found' })
    }

    // Allow access if:
    // 1. User is the client who owns the project
    // 2. User is the assigned programmer
    // 3. User is an admin
    if (
      project.clientId === req.user.id ||
      (project.assignedProgrammerId && project.assignedProgrammerId === req.user.id) ||
      req.user.role === 'admin'
    ) {
      req.project = project
      next()
    } else {
      return res.status(403).json({
        message: 'Not authorized to access this project',
      })
    }
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message })
  }
}
