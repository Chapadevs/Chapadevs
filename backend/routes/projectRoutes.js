import express from 'express'
import {
  createProject,
  getProjects,
  getProjectById,
  getProjectPreviews,
  getPhaseProposal,
  confirmPhases,
  updateProject,
  updatePhase,
  updateSubStep,
  answerQuestion,
  approvePhase,
  uploadAttachment,
  deleteAttachment,
  deleteProject,
  getMyProjects,
  getAssignedProjects,
  updateProjectStatus,
  confirmReady,
  markProjectReady,
  startDevelopment,
  stopDevelopment,
  markProjectCompleted,
  markProjectCancelled,
  upload,
} from '../controllers/projectController.js'
import { protect, authorizeProjectAccess } from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes are protected
router.use(protect)

// Client routes - get their own projects
router.get('/my-projects', getMyProjects)

// Programmer routes - get assigned projects
router.get('/assigned', getAssignedProjects)

// General routes
router.post('/', createProject)
router.get('/', getProjects)
router.put('/:id/ready', updateProjectStatus)
router.put('/:id/holding', updateProjectStatus)
router.put('/:id/confirm-ready', authorizeProjectAccess, confirmReady)
router.put('/:id/mark-ready', authorizeProjectAccess, markProjectReady)
router.put('/:id/start-development', authorizeProjectAccess, startDevelopment)
router.put('/:id/stop-development', authorizeProjectAccess, stopDevelopment)
router.put('/:id/complete', authorizeProjectAccess, markProjectCompleted)
router.put('/:id/cancel', authorizeProjectAccess, markProjectCancelled)
router.get('/:id/previews', authorizeProjectAccess, getProjectPreviews)
router.get('/:id/phases/proposal', authorizeProjectAccess, getPhaseProposal)
router.post('/:id/phases/confirm', authorizeProjectAccess, confirmPhases)
router.patch('/:id/phases/:phaseId', authorizeProjectAccess, updatePhase)
router.post('/:id/phases/:phaseId/sub-steps', authorizeProjectAccess, updateSubStep)
router.post('/:id/phases/:phaseId/questions/:questionId/answer', authorizeProjectAccess, answerQuestion)
router.post('/:id/phases/:phaseId/approve', authorizeProjectAccess, approvePhase)
router.post('/:id/phases/:phaseId/attachments', authorizeProjectAccess, upload.single('file'), uploadAttachment)
router.delete('/:id/phases/:phaseId/attachments/:attachmentId', authorizeProjectAccess, deleteAttachment)
router
  .route('/:id')
  .get(authorizeProjectAccess, getProjectById)
  .put(authorizeProjectAccess, updateProject)
  .delete(authorizeProjectAccess, deleteProject)

export default router

