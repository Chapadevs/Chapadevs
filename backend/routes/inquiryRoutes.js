import express from 'express'
import { submitInquiry } from '../controllers/inquiryController.js'

const router = express.Router()

router.post('/', submitInquiry)

export default router
