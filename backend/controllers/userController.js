import User from '../models/User.js'
import asyncHandler from 'express-async-handler'

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password')
  res.json(users)
})

// @desc    Get all programmers
// @route   GET /api/users/programmers
// @access  Private
export const getProgrammers = asyncHandler(async (req, res) => {
  const programmers = await User.find({ role: 'programmer' }).select('-password')
  res.json(programmers)
})

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password')

  if (user) {
    res.json(user)
  } else {
    res.status(404)
    throw new Error('User not found')
  }
})

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)

  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  user.name = req.body.name || user.name
  user.email = req.body.email || user.email
  user.role = req.body.role || user.role

  if (user.role === 'programmer') {
    if (req.body.skills !== undefined) user.skills = req.body.skills
    if (req.body.bio !== undefined) user.bio = req.body.bio
    if (req.body.hourlyRate !== undefined) user.hourlyRate = req.body.hourlyRate
  }

  const updatedUser = await user.save()

  res.json({
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    skills: updatedUser.skills,
    bio: updatedUser.bio,
    hourlyRate: updatedUser.hourlyRate,
  })
})

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)

  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  await user.deleteOne()
  res.json({ message: 'User removed' })
})
