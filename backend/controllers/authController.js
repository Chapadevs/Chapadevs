import crypto from 'crypto'
import User from '../models/User.js'
import generateToken from '../utils/generateToken.js'
import asyncHandler from 'express-async-handler'
import mongoose from 'mongoose'
import { sendMail } from '../services/emailService.js'
import { getWelcomeEmail, getPasswordResetEmail, getPasswordChangeEmail } from '../utils/emailTemplates.js'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Helper to check database connection
const checkDBConnection = () => {
  if (mongoose.connection.readyState !== 1) {
    const error = new Error('Database connection unavailable. Please try again later.')
    error.statusCode = 503
    throw error
  }
}

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = asyncHandler(async (req, res) => {
  checkDBConnection()
  
  const { name, email, password, role } = req.body

  if (!name || !email || !password) {
    res.status(400)
    throw new Error('Please add all required fields')
  }

  const userExists = await User.findOne({ email })

  if (userExists) {
    res.status(400)
    throw new Error('User already exists')
  }

  // Normalize legacy role name "client" to "user"
  const normalizedRole = role === 'client' ? 'user' : role

  const emailVerificationToken = crypto.randomBytes(32).toString('hex')
  const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const user = await User.create({
    name,
    email,
    password,
    role: normalizedRole || 'user',
    isEmailVerified: false,
    emailVerificationToken,
    emailVerificationExpires,
    ...(role === 'programmer' && {
      skills: [],
      bio: '',
      hourlyRate: null,
    }),
  })

  if (user) {
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')
    const verificationUrl = `${frontendUrl}/verify-email?token=${emailVerificationToken}`
    const { text, html, subject } = getWelcomeEmail({
      name: user.name,
      email: user.email,
      verificationUrl
    })
    const emailResult = await sendMail({
      to: user.email,
      subject,
      text,
      html
    })
    if (!emailResult.success) {
      console.error('Welcome/verification email failed:', emailResult.error)
    }

    res.status(201).json({
      message: 'Please verify your email. We sent a verification link to your inbox.',
      email: user.email,
    })
  } else {
    res.status(400)
    throw new Error('Invalid user data')
  }
})

// @desc    Verify email address (click link from welcome email)
// @route   GET /api/auth/verify-email
// @access  Public
export const verifyEmail = asyncHandler(async (req, res) => {
  checkDBConnection()

  let rawToken = req.query.token
  if (typeof rawToken !== 'string') rawToken = ''
  let token = rawToken.trim()
  try {
    const decoded = decodeURIComponent(token)
    if (decoded !== token) token = decoded.trim()
  } catch (_) { /* keep token as-is */ }
  if (!token) {
    res.status(400)
    throw new Error('Verification token is required. Use the full link from the email.')
  }

  let user = await User.findOne({
    emailVerificationToken: token
  }).select('+emailVerificationToken +emailVerificationExpires +isEmailVerified')

  if (!user && rawToken.trim() !== token) {
    user = await User.findOne({
      emailVerificationToken: rawToken.trim()
    }).select('+emailVerificationToken +emailVerificationExpires +isEmailVerified')
  }

  if (!user) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Verify email: no user found for token length', token.length, '(expected 64). Link may have been used already or from a different environment.')
    }
    res.status(200).json({
      success: true,
      message: 'This link was already used or has expired. If you can log in, your email is already verified.'
    })
    return
  }
  if (user.emailVerificationExpires && new Date() > user.emailVerificationExpires) {
    res.status(400)
    throw new Error('Verification link has expired. You can still log in; consider signing up again if you need a new link.')
  }

  if (user.isEmailVerified) {
    res.json({
      success: true,
      message: 'Your email was already verified. You can log in.'
    })
    return
  }

  user.isEmailVerified = true
  user.emailVerificationToken = undefined
  user.emailVerificationExpires = undefined
  await user.save({ validateBeforeSave: false })

  res.json({
    success: true,
    message: 'Your email has been verified. You can now log in.'
  })
})

const RESET_PASSWORD_EXPIRY_MS = 60 * 60 * 1000 // 1 hour

// @desc    Forgot password – send reset link to email
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(async (req, res) => {
  checkDBConnection()

  const email = (req.body.email || '').trim().toLowerCase()
  if (!email) {
    res.status(400)
    throw new Error('Email is required')
  }

  const user = await User.findOne({ email }).select('+resetPasswordToken +resetPasswordExpires')
  const genericMessage = 'If that email is registered, we sent a reset link. Check your inbox and spam folder.'

  if (user) {
    const resetPasswordToken = crypto.randomBytes(32).toString('hex')
    const resetPasswordExpires = new Date(Date.now() + RESET_PASSWORD_EXPIRY_MS)
    user.resetPasswordToken = resetPasswordToken
    user.resetPasswordExpires = resetPasswordExpires
    await user.save({ validateBeforeSave: false })

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')
    const resetUrl = `${frontendUrl}/reset-password?token=${resetPasswordToken}`
    const { text, html, subject } = getPasswordResetEmail({ name: user.name, resetUrl })
    const emailResult = await sendMail({
      to: user.email,
      subject,
      text,
      html
    })
    if (!emailResult.success) {
      console.error('Password reset email failed:', emailResult.error)
    }
  }

  res.status(200).json({ message: genericMessage })
})

// @desc    Reset password with token from email link
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = asyncHandler(async (req, res) => {
  checkDBConnection()

  let rawToken = req.body.token
  if (typeof rawToken !== 'string') rawToken = ''
  let token = rawToken.trim()
  try {
    const decoded = decodeURIComponent(token)
    if (decoded !== token) token = decoded.trim()
  } catch (_) { /* keep token as-is */ }

  const newPassword = (req.body.newPassword || '').trim()
  if (!token) {
    res.status(400)
    throw new Error('Reset token is required.')
  }
  if (!newPassword || newPassword.length < 6) {
    res.status(400)
    throw new Error('New password must be at least 6 characters.')
  }

  const user = await User.findOne({
    resetPasswordToken: token
  }).select('+resetPasswordToken +resetPasswordExpires +password')

  if (!user) {
    res.status(400)
    throw new Error('Invalid or expired reset link. Request a new one from the forgot password page.')
  }
  if (user.resetPasswordExpires && new Date() > user.resetPasswordExpires) {
    res.status(400)
    throw new Error('Reset link has expired. Request a new one from the forgot password page.')
  }

  user.password = newPassword
  user.resetPasswordToken = undefined
  user.resetPasswordExpires = undefined
  await user.save()

  res.status(200).json({
    message: 'Password reset. You can log in with your new password.'
  })
})

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
export const loginUser = asyncHandler(async (req, res) => {
  checkDBConnection()
  
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400)
    throw new Error('Please add email and password')
  }

  const user = await User.findOne({ email }).select('+password')

  if (!user || !(await user.matchPassword(password))) {
    res.status(401)
    throw new Error('Invalid email or password')
  }

  if (user.isEmailVerified === false) {
    res.status(403)
    throw new Error('Please verify your email before logging in. Check your inbox (and spam folder) for the verification link.')
  }

  // Update status to 'online' on login
  user.status = 'online'
  user.lastSeen = new Date()
  await user.save()

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    avatar: user.avatar,
    company: user.company,
    phone: user.phone,
    industry: user.industry,
    skills: user.skills,
    bio: user.bio,
    hourlyRate: user.hourlyRate,
    token: generateToken(user._id),
  })
})

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
  checkDBConnection()
  
  const user = await User.findById(req.user._id)

  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    avatar: user.avatar,
    company: user.company,
    phone: user.phone,
    industry: user.industry,
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
  checkDBConnection()
  
  const user = await User.findById(req.user._id)

  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  user.name = req.body.name || user.name
  user.email = req.body.email || user.email

  // Handle avatar (base64 data URL - convert to file and save)
  if (req.body.avatar !== undefined && req.body.avatar) {
    try {
      // Check if it's a base64 data URL
      if (req.body.avatar.startsWith('data:image/')) {
        // Extract base64 data and image type
        const matches = req.body.avatar.match(/^data:image\/(\w+);base64,(.+)$/)
        if (matches) {
          const imageType = matches[1] || 'jpeg'
          const base64Data = matches[2]
          
          // Create uploads/avatars directory if it doesn't exist
          const uploadDir = path.join(__dirname, '../uploads/avatars')
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true })
          }

          // Generate unique filename
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
          const filename = `${uniqueSuffix}.${imageType}`
          const filePath = path.join(uploadDir, filename)

          // Delete old avatar if it exists
          if (user.avatar && user.avatar.startsWith('/uploads/avatars/')) {
            const oldFilePath = path.join(__dirname, '..', user.avatar)
            if (fs.existsSync(oldFilePath)) {
              try {
                fs.unlinkSync(oldFilePath)
              } catch (err) {
                console.error('Error deleting old avatar:', err)
              }
            }
          }

          // Convert base64 to buffer and save file
          const imageBuffer = Buffer.from(base64Data, 'base64')
          fs.writeFileSync(filePath, imageBuffer)

          // Store the URL path
          user.avatar = `/uploads/avatars/${filename}`
        } else {
          // If it's not a valid base64 data URL, clear the avatar
          user.avatar = null
        }
      } else if (req.body.avatar === '' || req.body.avatar === null) {
        // Delete old avatar if clearing
        if (user.avatar && user.avatar.startsWith('/uploads/avatars/')) {
          const oldFilePath = path.join(__dirname, '..', user.avatar)
          if (fs.existsSync(oldFilePath)) {
            try {
              fs.unlinkSync(oldFilePath)
            } catch (err) {
              console.error('Error deleting old avatar:', err)
            }
          }
        }
        user.avatar = null
      } else {
        // If it's already a path, keep it
        user.avatar = req.body.avatar
      }
    } catch (error) {
      console.error('Error saving avatar:', error)
      // Don't fail the entire update if avatar save fails
    }
  }

  // Handle client/user fields
  if (req.body.company !== undefined) user.company = req.body.company
  if (req.body.phone !== undefined) user.phone = req.body.phone
  if (req.body.industry !== undefined) user.industry = req.body.industry
  
  // Bio is available for all users
  if (req.body.bio !== undefined) user.bio = req.body.bio

  if (user.role === 'programmer') {
    if (req.body.skills !== undefined) user.skills = req.body.skills
    if (req.body.hourlyRate !== undefined) user.hourlyRate = req.body.hourlyRate
  }

  const updatedUser = await user.save()

  res.json({
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    avatar: updatedUser.avatar,
    company: updatedUser.company,
    phone: updatedUser.phone,
    industry: updatedUser.industry,
    skills: updatedUser.skills,
    bio: updatedUser.bio,
    hourlyRate: updatedUser.hourlyRate,
  })
})

const PASSWORD_CHANGE_EXPIRY_MS = 60 * 60 * 1000 // 1 hour

// @desc    Request password change (sends confirmation email)
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = asyncHandler(async (req, res) => {
  checkDBConnection()
  
  const { currentPassword } = req.body

  if (!currentPassword) {
    res.status(400)
    throw new Error('Please provide your current password')
  }

  const user = await User.findById(req.user._id).select('+password +passwordChangeToken +passwordChangeExpires')

  if (!user || !(await user.matchPassword(currentPassword))) {
    res.status(401)
    throw new Error('Current password is incorrect')
  }

  // Generate token and expiry
  const passwordChangeToken = crypto.randomBytes(32).toString('hex')
  const passwordChangeExpires = new Date(Date.now() + PASSWORD_CHANGE_EXPIRY_MS)
  
  // Store new password temporarily (will be hashed when saved after confirmation)
  // We'll store it in a temporary field or use the token to look it up
  // For security, we'll require the new password again in the confirmation step
  user.passwordChangeToken = passwordChangeToken
  user.passwordChangeExpires = passwordChangeExpires
  await user.save({ validateBeforeSave: false })

  // Send confirmation email
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')
  const confirmUrl = `${frontendUrl}/confirm-password-change?token=${passwordChangeToken}`
  const { text, html, subject } = getPasswordChangeEmail({ 
    name: user.name, 
    confirmUrl 
  })
  
  // Store new password hash temporarily - we'll use a different approach
  // Instead, we'll require the user to enter the new password again in the confirmation page
  // For now, we'll encode it in the token URL or require it in the confirmation endpoint
  
  const emailResult = await sendMail({
    to: user.email,
    subject,
    text,
    html
  })
  
  if (!emailResult.success) {
    console.error('Password change email failed:', emailResult.error)
  }

  res.json({ 
    message: 'Please check your email to confirm the password change. The confirmation link expires in 1 hour.',
    email: user.email
  })
})

// @desc    Confirm password change with token from email
// @route   POST /api/auth/confirm-password-change
// @access  Public
export const confirmPasswordChange = asyncHandler(async (req, res) => {
  checkDBConnection()

  let rawToken = req.body.token
  if (typeof rawToken !== 'string') rawToken = ''
  let token = rawToken.trim()
  try {
    const decoded = decodeURIComponent(token)
    if (decoded !== token) token = decoded.trim()
  } catch (_) { /* keep token as-is */ }

  const newPassword = (req.body.newPassword || '').trim()
  
  if (!token) {
    res.status(400)
    throw new Error('Confirmation token is required.')
  }
  
  if (!newPassword || newPassword.length < 6) {
    res.status(400)
    throw new Error('New password must be at least 6 characters.')
  }

  const user = await User.findOne({
    passwordChangeToken: token
  }).select('+passwordChangeToken +passwordChangeExpires +password')

  if (!user) {
    res.status(400)
    throw new Error('Invalid or expired confirmation link. Request a new password change from your profile.')
  }
  
  if (user.passwordChangeExpires && new Date() > user.passwordChangeExpires) {
    res.status(400)
    throw new Error('Confirmation link has expired. Request a new password change from your profile.')
  }

  // Update password (will be hashed by pre-save hook)
  user.password = newPassword
  user.passwordChangeToken = undefined
  user.passwordChangeExpires = undefined
  await user.save()

  res.status(200).json({
    message: 'Password changed successfully. You can now log in with your new password.'
  })
})

// @desc    Logout user (set status to offline)
// @route   POST /api/auth/logout
// @access  Private
export const logoutUser = asyncHandler(async (req, res) => {
  checkDBConnection()
  
  const user = await User.findById(req.user._id)

  if (user) {
    user.status = 'offline'
    user.lastSeen = new Date()
    await user.save()
  }

  res.json({ message: 'Logged out successfully' })
})

// @desc    Delete user's own profile
// @route   DELETE /api/auth/profile
// @access  Private
export const deleteProfile = asyncHandler(async (req, res) => {
  checkDBConnection()
  
  const user = await User.findById(req.user._id)

  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  // Delete user account
  await user.deleteOne()

  res.json({ message: 'Account deleted successfully' })
})
