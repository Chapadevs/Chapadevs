import { useState, useEffect, useCallback } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import { projectAPI } from '../../../../../../services/api'
import { findSubStepIndex, getSubStepStatus } from '../../../utils/workspaceUtils'

const STATUS_ORDER = { pending: 0, in_progress: 1, waiting_client: 2, completed: 3 }

/**
 * Hook for cycle/phase API operations and state.
 * Handles status changes, sub-step CRUD, questions, approval, reset, unlock.
 */
export function useCyclePhase({
  phase,
  project,
  canChangePhaseStatus,
  canUpdateSubSteps,
  canAnswerQuestion,
  isProgrammerOrAdmin,
  onUpdate,
}) {
  const [loading, setLoading] = useState(false)
  const [addingPhaseQuestion, setAddingPhaseQuestion] = useState(false)
  const [error, setError] = useState(null)
  const [localPhase, setLocalPhase] = useState(phase)

  useEffect(() => {
    setLocalPhase(phase)
  }, [phase])

  const projectId = project?._id || project?.id
  const phaseId = localPhase?._id || localPhase?.id

  const handleStatusChange = useCallback(
    async (newStatus) => {
      if (!canChangePhaseStatus) {
        setError('Only the assigned programmer can change phase status')
        return
      }
      try {
        setLoading(true)
        setError(null)
        const updated = await projectAPI.updatePhase(projectId, phaseId, { status: newStatus })
        setLocalPhase(updated)
        onUpdate?.(updated)
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to update phase')
      } finally {
        setLoading(false)
      }
    },
    [canChangePhaseStatus, projectId, phaseId, onUpdate]
  )

  const handleSubStepUpdate = useCallback(
    async (subStepId, updates) => {
      if (!canUpdateSubSteps) {
        setError('Only the assigned programmer can update sub-steps')
        return
      }
      try {
        setLoading(true)
        setError(null)
        let updatedSubSteps = [...(localPhase.subSteps || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        const index = updatedSubSteps.findIndex((s) => (s._id || s.id)?.toString() === subStepId?.toString())
        if (index >= 0) {
          updatedSubSteps[index] = { ...updatedSubSteps[index], ...updates }
        } else {
          updatedSubSteps.push({ ...updates, order: updatedSubSteps.length + 1 })
        }
        const updated = await projectAPI.updatePhase(projectId, phaseId, { subSteps: updatedSubSteps })
        setLocalPhase(updated)
        onUpdate?.(updated)
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to update sub-step')
      } finally {
        setLoading(false)
      }
    },
    [canUpdateSubSteps, localPhase.subSteps, projectId, phaseId, onUpdate]
  )

  const sortedSubSteps = [...(localPhase.subSteps || [])].sort((a, b) => (a.order || 0) - (b.order || 0))
  const findSubStepIdx = useCallback((id) => findSubStepIndex(sortedSubSteps, id), [sortedSubSteps])

  const handleSubStepsReorder = useCallback(
    async (activeId, overId) => {
      if (!canUpdateSubSteps || !overId || activeId === overId) return
      const subSteps = [...(localPhase.subSteps || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      const activeIdx = findSubStepIdx(activeId)
      const overIdx = findSubStepIdx(overId)
      if (activeIdx < 0 || overIdx < 0 || activeIdx === overIdx) return
      const reordered = arrayMove(subSteps, activeIdx, overIdx).map((s, i) => ({ ...s, order: i + 1 }))
      try {
        setLoading(true)
        setError(null)
        const updated = await projectAPI.updatePhase(projectId, phaseId, { subSteps: reordered })
        setLocalPhase(updated)
        onUpdate?.(updated)
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to reorder')
      } finally {
        setLoading(false)
      }
    },
    [canUpdateSubSteps, localPhase.subSteps, projectId, phaseId, onUpdate, findSubStepIdx]
  )

  const handleSubStepStatusChange = useCallback(
    async (subStepId, newStatus) => {
      if (!canUpdateSubSteps) return
      const subSteps = [...(localPhase.subSteps || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      const idx = findSubStepIdx(subStepId)
      if (idx < 0) return
      const step = subSteps[idx]
      const updatedStep = { ...step, status: newStatus, completed: newStatus === 'completed' }
      const updatedSubSteps = subSteps.map((s, i) => (i === idx ? updatedStep : s))
      const sorted = [...updatedSubSteps].sort((a, b) => {
        const sa = STATUS_ORDER[getSubStepStatus(a)] ?? 0
        const sb = STATUS_ORDER[getSubStepStatus(b)] ?? 0
        if (sa !== sb) return sa - sb
        return (a.order ?? 0) - (b.order ?? 0)
      })
      const withOrder = sorted.map((s, i) => ({ ...s, order: i + 1 }))
      try {
        setLoading(true)
        setError(null)
        const updated = await projectAPI.updatePhase(projectId, phaseId, { subSteps: withOrder })
        setLocalPhase(updated)
        onUpdate?.(updated)
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to update status')
      } finally {
        setLoading(false)
      }
    },
    [canUpdateSubSteps, localPhase.subSteps, projectId, phaseId, onUpdate, findSubStepIdx]
  )

  const handleResetPhase = useCallback(async () => {
    if (!canChangePhaseStatus) {
      setError('Only the assigned programmer can reset phases')
      return
    }
    if (!window.confirm('Reset this phase to Not Started? All sub-step progress will be cleared.')) return
    try {
      setLoading(true)
      setError(null)
      const updated = await projectAPI.updatePhase(projectId, phaseId, { reset: true })
      setLocalPhase(updated)
      onUpdate?.(updated)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to reset phase')
    } finally {
      setLoading(false)
    }
  }, [canChangePhaseStatus, projectId, phaseId, onUpdate])

  const handleUnlockCycle = useCallback(async () => {
    if (!isProgrammerOrAdmin) return
    if (!window.confirm('Unlock this cycle to edit dates and tasks again?')) return
    try {
      setLoading(true)
      setError(null)
      const updated = await projectAPI.updatePhase(projectId, phaseId, { unlock: true })
      setLocalPhase(updated)
      onUpdate?.(updated)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to unlock cycle')
    } finally {
      setLoading(false)
    }
  }, [isProgrammerOrAdmin, projectId, phaseId, onUpdate])

  const handleApprove = useCallback(
    async (approved, feedback = null) => {
      if (!canAnswerQuestion) {
        setError('Only the client can approve phases')
        return
      }
      try {
        setLoading(true)
        setError(null)
        const updated = await projectAPI.approvePhase(projectId, phaseId, approved, feedback)
        setLocalPhase(updated)
        onUpdate?.(updated)
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to approve phase')
      } finally {
        setLoading(false)
      }
    },
    [canAnswerQuestion, projectId, phaseId, onUpdate]
  )

  const handleQuestionAnswer = useCallback(
    async (questionId, answer, subStepOrder = null) => {
      try {
        setLoading(true)
        setError(null)
        const updated = await projectAPI.answerQuestion(projectId, phaseId, questionId, answer, subStepOrder)
        setLocalPhase(updated)
        onUpdate?.(updated)
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to save answer')
      } finally {
        setLoading(false)
      }
    },
    [projectId, phaseId, onUpdate]
  )

  const handleAddPhaseQuestion = useCallback(
    async (text, setNewPhaseQuestionText, userId) => {
      const trimmed = text?.trim()
      if (!trimmed) return
      const existing = localPhase.clientQuestions || []
      const maxOrder = existing.length > 0 ? Math.max(...existing.map((q) => q.order ?? 0)) : 0
      const newQuestion = {
        question: trimmed,
        required: false,
        order: maxOrder + 1,
        subStepOrder: null,
        createdBy: userId,
      }
      try {
        setAddingPhaseQuestion(true)
        setError(null)
        const updated = await projectAPI.updatePhase(projectId, phaseId, {
          clientQuestions: [...existing, newQuestion],
        })
        setLocalPhase(updated)
        setNewPhaseQuestionText('')
        onUpdate?.(updated)
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to add question')
      } finally {
        setAddingPhaseQuestion(false)
      }
    },
    [localPhase.clientQuestions, projectId, phaseId, onUpdate]
  )

  return {
    loading,
    addingPhaseQuestion,
    error,
    setError,
    localPhase,
    setLocalPhase,
    handleStatusChange,
    handleSubStepUpdate,
    handleSubStepsReorder,
    handleSubStepStatusChange,
    handleResetPhase,
    handleUnlockCycle,
    handleApprove,
    handleQuestionAnswer,
    handleAddPhaseQuestion,
    findSubStepIdx,
    sortedSubSteps,
  }
}
