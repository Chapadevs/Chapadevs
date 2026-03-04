import express from 'express'
import {
  createProject,
  generateProjectRequirements,
  getProjects,
  getProjectById,
  getProjectPreviews,
  getProjectActivity,
  getPhaseProposal,
  savePhaseProposal,
  regeneratePhaseProposal,
  confirmPhases,
  updateProject,
  updatePhase,
  updateSubStep,
  answerQuestion,
  approvePhase,
  uploadAttachment,
  deleteAttachment,
  updateAttachment,
  getAttachmentSignedUrls,
  getProjectAttachmentSignedUrls,
  uploadSubStepAttachment,
  deleteSubStepAttachment,
  updateSubStepAttachment,
  deleteProject,
  cleanupOrphanedProjects,
  getMyProjects,
  getAssignedProjects,
  updateProjectStatus,
  confirmReady,
  unconfirmReady,
  markProjectReady,
  unmarkProjectReady,
  startDevelopment,
  stopDevelopment,
  markProjectCompleted,
  markProjectCancelled,
  upload,
} from '../controllers/projectController.js'
import { protect, authorize, authorizeProjectAccess } from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes are protected
router.use(protect)

// Admin: cleanup orphaned projects (client deleted but project still in DB)
router.post('/cleanup-orphaned', authorize('admin'), cleanupOrphanedProjects)

// Client routes - get their own projects
router.get('/my-projects', getMyProjects)

// Programmer routes - get assigned projects
router.get('/assigned', getAssignedProjects)

// General routes
router.post('/', createProject)
router.post('/generate-requirements', generateProjectRequirements)
router.get('/', getProjects)
router.put('/:id/ready', updateProjectStatus)
router.put('/:id/holding', updateProjectStatus)
router.put('/:id/confirm-ready', authorizeProjectAccess, confirmReady)
router.put('/:id/unconfirm-ready', authorizeProjectAccess, unconfirmReady)
router.put('/:id/mark-ready', authorizeProjectAccess, markProjectReady)
router.put('/:id/unmark-ready', authorizeProjectAccess, unmarkProjectReady)
router.put('/:id/start-development', authorizeProjectAccess, startDevelopment)
router.put('/:id/stop-development', authorizeProjectAccess, stopDevelopment)
router.put('/:id/complete', authorizeProjectAccess, markProjectCompleted)
router.put('/:id/cancel', authorizeProjectAccess, markProjectCancelled)
router.get('/:id/previews', authorizeProjectAccess, getProjectPreviews)
router.post('/:id/attachments/signed-urls', authorizeProjectAccess, getProjectAttachmentSignedUrls)
router.get('/:id/activity', authorizeProjectAccess, getProjectActivity)
router.get('/:id/phases/proposal', authorizeProjectAccess, getPhaseProposal)
router.patch('/:id/phases/proposal', authorizeProjectAccess, savePhaseProposal)
router.post('/:id/phases/proposal/regenerate', authorizeProjectAccess, regeneratePhaseProposal)
router.post('/:id/phases/confirm', authorizeProjectAccess, confirmPhases)
router.patch('/:id/phases/:phaseId', authorizeProjectAccess, updatePhase)
router.post('/:id/phases/:phaseId/sub-steps', authorizeProjectAccess, updateSubStep)
router.post('/:id/phases/:phaseId/questions/:questionId/answer', authorizeProjectAccess, answerQuestion)
router.post('/:id/phases/:phaseId/approve', authorizeProjectAccess, approvePhase)
router.post('/:id/phases/:phaseId/attachments', authorizeProjectAccess, upload.single('file'), uploadAttachment)
router.post('/:id/phases/:phaseId/attachments/signed-urls', authorizeProjectAccess, getAttachmentSignedUrls)
router.delete('/:id/phases/:phaseId/attachments/:attachmentId', authorizeProjectAccess, deleteAttachment)
router.patch('/:id/phases/:phaseId/attachments/:attachmentId', authorizeProjectAccess, updateAttachment)
router.post('/:id/phases/:phaseId/sub-steps/:subStepId/attachments', authorizeProjectAccess, upload.single('file'), uploadSubStepAttachment)
router.delete('/:id/phases/:phaseId/sub-steps/:subStepId/attachments/:attachmentId', authorizeProjectAccess, deleteSubStepAttachment)
router.patch('/:id/phases/:phaseId/sub-steps/:subStepId/attachments/:attachmentId', authorizeProjectAccess, updateSubStepAttachment)
router
  .route('/:id')
  .get(authorizeProjectAccess, getProjectById)
  .put(authorizeProjectAccess, updateProject)
  .delete(authorizeProjectAccess, deleteProject)

export default router

