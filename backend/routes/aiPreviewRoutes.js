import express from 'express'
import {
  generateAIPreview,
  generateAIPreviewStream,
  getAIPreviewUsage,
  getAIPreviews,
  getAIPreviewById,
  getCodesandboxEmbed,
  deleteAIPreview,
  regenerateAIPreview
} from '../controllers/aiPreviewController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes are protected
router.use(protect)

router.get('/usage', getAIPreviewUsage)

router.post('/stream', generateAIPreviewStream)

router.route('/')
  .post(generateAIPreview)
  .get(getAIPreviews)

router.get('/:id/codesandbox-embed', getCodesandboxEmbed)

router.route('/:id')
  .get(getAIPreviewById)
  .delete(deleteAIPreview)

router.post('/:id/regenerate', regenerateAIPreview)

export default router












