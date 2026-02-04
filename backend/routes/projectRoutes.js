import express from 'express'
import {
  createProject,
  getProjects,
  getProjectById,
  getProjectPreviews,
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
router.get('/:id/previews', authorizeProjectAccess, getProjectPreviews)
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

