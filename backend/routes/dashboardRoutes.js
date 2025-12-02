import express from 'express'
import { getDashboard } from '../controllers/dashboardController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes are protected
router.use(protect)

router.get('/', getDashboard)

export default router






