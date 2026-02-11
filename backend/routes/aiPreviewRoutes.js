import express from 'express'
import {
  generateAIPreview,
  getAIPreviewUsage,
  getAIPreviews,
  getAIPreviewById,
  deleteAIPreview,
  regenerateAIPreview
} from '../controllers/aiPreviewController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes are protected
router.use(protect)

router.get('/usage', getAIPreviewUsage)

router.route('/')
  .post(generateAIPreview)
  .get(getAIPreviews)

router.route('/:id')
  .get(getAIPreviewById)
  .delete(deleteAIPreview)

router.post('/:id/regenerate', regenerateAIPreview)

export default router












