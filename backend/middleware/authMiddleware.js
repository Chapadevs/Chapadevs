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
      req.user = await User.findById(decoded.id).select('-password')

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' })
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
    const project = await Project.findById(req.params.id)

    if (!project) {
      return res.status(404).json({ message: 'Project not found' })
    }

    const clientId = project.clientId?.toString()
    const assignedProgrammerId = project.assignedProgrammerId?.toString()
    const userId = req.user._id.toString()
    
    // Check if user is in assignedProgrammerIds array
    const assignedProgrammerIds = project.assignedProgrammerIds || []
    const isInAssignedProgrammers = assignedProgrammerIds.some(
      id => id?.toString() === userId
    )

    // Allow access if:
    // 1. User is the owner of the project
    // 2. User is the assigned programmer (primary)
    // 3. User is in the assignedProgrammerIds array (team members)
    // 4. User is an admin
    if (
      clientId === userId ||
      (assignedProgrammerId && assignedProgrammerId === userId) ||
      isInAssignedProgrammers ||
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
