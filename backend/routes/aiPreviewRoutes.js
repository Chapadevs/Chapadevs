import express from 'express'
import {
  generateAIPreview,
  getAIPreviews,
  getAIPreviewById,
  deleteAIPreview
} from '../controllers/aiPreviewController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes are protected
router.use(protect)

router.route('/')
  .post(generateAIPreview)
  .get(getAIPreviews)

router.route('/:id')
  .get(getAIPreviewById)
  .delete(deleteAIPreview)

export default router






