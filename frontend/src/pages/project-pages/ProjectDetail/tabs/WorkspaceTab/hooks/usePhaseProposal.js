import { useState, useEffect, useCallback, useRef } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import { projectAPI } from '../../../../../../services/api'
import { matchSubStepId, matchPhaseIndex } from '../../../utils/workspaceUtils'

const STORAGE_KEY_PREFIX = 'workspace-create-steps-'
const DEBOUNCE_SAVE_MS = 500

/**
 * Hook for phase proposal state and handlers (Review timeline flow).
 * Used when project has no phases and user creates steps.
 */
export function usePhaseProposal(projectId, hasNoPhases, canCreateSteps) {
  const storageKey = projectId ? `${STORAGE_KEY_PREFIX}${projectId}` : null
  const [userRequestedCreateSteps, setUserRequestedCreateStepsState] = useState(() => {
    if (!storageKey || typeof sessionStorage === 'undefined') return false
    return sessionStorage.getItem(storageKey) === 'true'
  })
  const showReviewWorkspace = hasNoPhases && canCreateSteps && userRequestedCreateSteps
  const setUserRequestedCreateSteps = useCallback(
    (value) => {
      setUserRequestedCreateStepsState(value)
      if (storageKey && typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(storageKey, value ? 'true' : '')
      }
    },
    [storageKey]
  )

  const [proposal, setProposal] = useState([])
  const [proposalLoading, setProposalLoading] = useState(false)
  const [proposalError, setProposalError] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [editingProposal, setEditingProposal] = useState([])
  const [reviewPhaseIndex, setReviewPhaseIndex] = useState(0)
  const saveTimeoutRef = useRef(null)

  useEffect(() => {
    if (!showReviewWorkspace || !projectId) return
    let cancelled = false
    setProposalLoading(true)
    setProposalError(null)
    projectAPI
      .getPhaseProposal(projectId)
      .then((data) => {
        if (!cancelled) {
          const arr = Array.isArray(data) ? data : []
          setProposal(arr)
          setEditingProposal(arr.map((p) => ({ ...p })))
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setProposalError(err.response?.data?.message || err.message || 'Failed to load proposal')
        }
      })
      .finally(() => {
        if (!cancelled) setProposalLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [showReviewWorkspace, projectId])

  const saveProposal = useCallback(
    (payload) => {
      if (!projectId || !payload?.length) return
      projectAPI.savePhaseProposal(projectId, payload).catch(() => {})
    },
    [projectId]
  )

  useEffect(() => {
    if (editingProposal.length > 0 && reviewPhaseIndex >= editingProposal.length) {
      setReviewPhaseIndex(Math.max(0, editingProposal.length - 1))
    }
  }, [editingProposal.length, reviewPhaseIndex])

  useEffect(() => {
    if (!projectId || editingProposal.length === 0) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      saveProposal(editingProposal)
      saveTimeoutRef.current = null
    }, DEBOUNCE_SAVE_MS)
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [editingProposal, projectId, saveProposal])

  const handleProposalFieldChange = useCallback((index, field, value) => {
    setEditingProposal((prev) => {
      const next = prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
      return next
    })
  }, [])

  const handleSubStepChange = useCallback((phaseIndex, subStepIndex, updates) => {
    setEditingProposal((prev) =>
      prev.map((p, i) => {
        if (i !== phaseIndex) return p
        const subSteps = [...(p.subSteps || [])]
        if (subStepIndex >= subSteps.length) return p
        subSteps[subStepIndex] = { ...subSteps[subStepIndex], ...updates }
        return { ...p, subSteps }
      })
    )
  }, [])

  const handleSubStepTitleChange = useCallback((phaseIndex, subStepIndex, newTitle) => {
    handleSubStepChange(phaseIndex, subStepIndex, { title: newTitle })
  }, [handleSubStepChange])

  const handleSubStepsReorder = useCallback((phaseIndex, activeId, overId) => {
    if (!overId || activeId === overId) return
    const active = matchSubStepId(activeId)
    const over = matchSubStepId(overId)
    if (!active || !over || active.phaseIdx !== over.phaseIdx || active.phaseIdx !== phaseIndex) return
    setEditingProposal((prev) =>
      prev.map((p, i) => {
        if (i !== phaseIndex) return p
        const subSteps = [...(p.subSteps || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        const reordered = arrayMove(subSteps, active.subIdx, over.subIdx)
        return { ...p, subSteps: reordered.map((s, idx) => ({ ...s, order: idx + 1 })) }
      })
    )
  }, [])

  const handleRegenerateProposal = useCallback(async () => {
    if (!window.confirm('This will replace your current proposal with an AI-generated timeline. Continue?')) return
    if (!projectId) return
    setRegenerating(true)
    setProposalError(null)
    try {
      const data = await projectAPI.regeneratePhaseProposal(projectId, editingProposal)
      const arr = Array.isArray(data) ? data : []
      setProposal(arr)
      setEditingProposal(arr.map((p) => ({ ...p })))
      setReviewPhaseIndex(0)
    } catch (err) {
      setProposalError(err.response?.data?.message || err.message || 'Failed to regenerate proposal')
    } finally {
      setRegenerating(false)
    }
  }, [projectId, editingProposal])

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event
      const phaseIndex = matchPhaseIndex(active?.id)
      if (phaseIndex != null) handleSubStepsReorder(phaseIndex, active?.id, over?.id)
    },
    [handleSubStepsReorder]
  )

  const handleConfirmWorkspace = useCallback(
    async (onWorkspaceConfirmed) => {
      if (!projectId || editingProposal.length === 0) return
      setConfirming(true)
      setProposalError(null)
      try {
        const payload = editingProposal.map((p, idx) => ({
          title: p.title || '',
          description: p.description ?? null,
          order: idx + 1,
          deliverables: Array.isArray(p.deliverables) ? p.deliverables : [],
          weeks: p.weeks != null ? p.weeks : null,
          dueDate: p.dueDate || null,
          subSteps: (Array.isArray(p.subSteps) ? p.subSteps : [])
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((s, i) => ({ ...s, order: i + 1 })),
        }))
        await projectAPI.confirmPhases(projectId, payload)
        onWorkspaceConfirmed?.()
      } catch (err) {
        setProposalError(err.response?.data?.message || err.message || 'Failed to confirm timeline')
      } finally {
        setConfirming(false)
      }
    },
    [projectId, editingProposal]
  )

  return {
    userRequestedCreateSteps,
    setUserRequestedCreateSteps,
    proposal,
    proposalLoading,
    proposalError,
    editingProposal,
    setEditingProposal,
    reviewPhaseIndex,
    setReviewPhaseIndex,
    confirming,
    regenerating,
    handleProposalFieldChange,
    handleSubStepTitleChange,
    handleSubStepChange,
    handleSubStepsReorder,
    handleRegenerateProposal,
    handleDragEnd,
    handleConfirmWorkspace,
  }
}
