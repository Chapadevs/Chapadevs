import express from 'express'
import {
  createSupportTicket,
  getSupportTickets,
  getSupportTicketById,
  updateSupportTicket,
  deleteSupportTicket
} from '../controllers/supportTicketController.js'
import { protect, authorize } from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes are protected
router.use(protect)

router.route('/')
  .post(createSupportTicket)
  .get(getSupportTickets)

router.route('/:id')
  .get(getSupportTicketById)
  .put(updateSupportTicket)
  .delete(authorize('admin'), deleteSupportTicket)

export default router






