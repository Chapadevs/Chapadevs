import express from 'express'
import {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  changePassword,
  confirmPasswordChange,
  verifyEmail,
  forgotPassword,
  resetPassword,
  logoutUser,
  deleteProfile,
} from '../controllers/authController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

// Public routes
router.post('/register', registerUser)
router.post('/login', loginUser)
router.get('/verify-email', verifyEmail)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)
router.post('/confirm-password-change', confirmPasswordChange)

// Protected routes
router.get('/me', protect, getMe)
router.put('/profile', protect, updateProfile)
router.delete('/profile', protect, deleteProfile)
router.put('/change-password', protect, changePassword)
router.post('/logout', protect, logoutUser)

export default router

