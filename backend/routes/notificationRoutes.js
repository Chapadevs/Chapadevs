import express from 'express'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from '../controllers/notificationController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes are protected
router.use(protect)

router.get('/unread-count', getUnreadCount)
router.put('/read-all', markAllAsRead)

router.route('/')
  .get(getNotifications)

router.route('/:id')
  .put(markAsRead)
  .delete(deleteNotification)

export default router



