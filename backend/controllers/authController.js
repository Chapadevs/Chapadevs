import User from '../models/User.js'
import generateToken from '../utils/generateToken.js'
import asyncHandler from 'express-async-handler'

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body

  // Validation
  if (!name || !email || !password) {
    res.status(400)
    throw new Error('Please add all required fields')
  }

  // Check if user exists
  const userExists = await User.findOne({ where: { email } })

  if (userExists) {
    res.status(400)
    throw new Error('User already exists')
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role: role || 'user',
    // Initialize programmer fields if role is programmer
    ...(role === 'programmer' && {
      skills: [],
      bio: '',
      hourlyRate: null
    })
  })

  if (user) {
    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user.id),
    })
  } else {
    res.status(400)
    throw new Error('Invalid user data')
  }
})

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  // Validation
  if (!email || !password) {
    res.status(400)
    throw new Error('Please add email and password')
  }

  // Check for user email - include password for comparison
  const user = await User.findOne({ 
    where: { email },
    attributes: { include: ['password'] } // Include password in query
  })

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user.id),
    })
  } else {
    res.status(401)
    throw new Error('Invalid email or password')
  }
})

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id)

  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  res.json({
    _id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    skills: user.skills,
    bio: user.bio,
    hourlyRate: user.hourlyRate,
    createdAt: user.createdAt,
  })
})

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id)

  if (user) {
    // Update basic user fields
    user.name = req.body.name || user.name
    user.email = req.body.email || user.email

    // Update programmer fields if user is a programmer
    if (user.role === 'programmer') {
      if (req.body.skills !== undefined) user.skills = req.body.skills
      if (req.body.bio !== undefined) user.bio = req.body.bio
      if (req.body.hourlyRate !== undefined) user.hourlyRate = req.body.hourlyRate
    }

    const updatedUser = await user.save()

    res.json({
      _id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      skills: updatedUser.skills,
      bio: updatedUser.bio,
      hourlyRate: updatedUser.hourlyRate,
    })
  } else {
    res.status(404)
    throw new Error('User not found')
  }
})

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body

  if (!currentPassword || !newPassword) {
    res.status(400)
    throw new Error('Please provide current and new password')
  }

  const user = await User.findByPk(req.user.id, {
    attributes: { include: ['password'] }
  })

  if (user && (await user.matchPassword(currentPassword))) {
    user.password = newPassword
    await user.save()

    res.json({ message: 'Password updated successfully' })
  } else {
    res.status(401)
    throw new Error('Current password is incorrect')
  }
})
