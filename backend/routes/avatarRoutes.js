import express from 'express'
import { getSignedAvatarUrlHandler, getAvatarImageHandler } from '../controllers/avatarController.js'

const router = express.Router()

// Public - avatars are profile pictures
router.get('/signed-url', getSignedAvatarUrlHandler)
router.get('/image', getAvatarImageHandler)

export default router
