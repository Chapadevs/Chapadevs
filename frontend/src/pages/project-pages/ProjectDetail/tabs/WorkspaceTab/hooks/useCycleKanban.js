import { useCallback, useRef } from 'react'
import { pointerWithin, rectIntersection, closestCorners, closestCenter, useSensors, useSensor, PointerSensor, KeyboardSensor } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { getSubStepStatus } from '../../../utils/workspaceUtils'

/**
 * Hook for Kanban DnD: collision detection and drag handlers.
 * Programmers: full movement. Clients: only waiting_client -> completed.
 */
export function useCycleKanban({
  sortedSubSteps,
  canUpdateSubSteps,
  canMoveSubStepToCompleted,
  phaseStatus,
  handleSubStepsReorder,
  handleSubStepStatusChange,
}) {
  const lastOverRef = useRef(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const kanbanCollisionDetection = useCallback((args) => {
    const { droppableContainers, ...rest } = args
    const containers = Array.isArray(droppableContainers)
      ? droppableContainers
      : Array.from(droppableContainers?.values?.() ?? [])
    const columnContainers = containers.filter((c) => String(c?.id ?? '').startsWith('column-'))
    const cardContainers = containers.filter((c) => !String(c?.id ?? '').startsWith('column-'))

    if (columnContainers.length > 0) {
      const columnByPointer = pointerWithin({ ...rest, droppableContainers: columnContainers })
      if (columnByPointer.length > 0) return columnByPointer
      const columnByCenter = closestCenter({ ...rest, droppableContainers: columnContainers })
      if (columnByCenter.length > 0) return columnByCenter
    }

    const pointer = pointerWithin({ ...rest, droppableContainers: cardContainers })
    if (pointer.length > 0) return pointer
    const corners = closestCorners({ ...rest, droppableContainers: cardContainers })
    if (corners.length > 0) return corners
    return rectIntersection(args)
  }, [])

  const handleKanbanDragStart = useCallback(() => {
    lastOverRef.current = null
  }, [])

  const handleKanbanDragOver = useCallback((event) => {
    if (event.over) {
      lastOverRef.current = event.over
    }
  }, [])

  const handleKanbanDragEnd = useCallback(
    (event) => {
      const { active, over } = event
      const effectiveOver = over ?? lastOverRef.current
      lastOverRef.current = null
      if (!effectiveOver) return
      if (phaseStatus === 'completed' || phaseStatus === 'not_started') return
      const activeId = active?.id
      const overId = String(effectiveOver.id)
      if (activeId === overId) return
      const activeStep = sortedSubSteps.find((s) => {
        const sid = (s._id ?? s.id)?.toString?.() ?? String(s._id ?? s.id)
        return sid === String(activeId) || `substep-${s.order ?? 0}` === String(activeId)
      })
      const activeStatus = activeStep
        ? getSubStepStatus(activeStep)
        : active?.data?.current?.status ?? active?.data?.status ?? 'pending'
      const isClientMove = canMoveSubStepToCompleted && !canUpdateSubSteps
      const clientCanMoveToCompleted =
        isClientMove && activeStatus === 'waiting_client'
      if (overId.startsWith('column-')) {
        const targetStatus = overId.replace('column-', '')
        const canDoStatusChange =
          canUpdateSubSteps ||
          (clientCanMoveToCompleted && targetStatus === 'completed')
        if (canDoStatusChange && targetStatus !== activeStatus) {
          handleSubStepStatusChange(activeId, targetStatus)
        }
      } else {
        const overStep = sortedSubSteps.find((s) => {
          const sid = (s._id ?? s.id)?.toString?.() ?? String(s._id ?? s.id)
          return sid === overId || `substep-${s.order ?? 0}` === overId
        })
        const overStatus = overStep ? getSubStepStatus(overStep) : null
        if (!overStatus) return
        if (overStatus === activeStatus) {
          if (canUpdateSubSteps) {
            handleSubStepsReorder(activeId, overId)
          }
        } else {
          const canDoStatusChange =
            canUpdateSubSteps ||
            (clientCanMoveToCompleted && overStatus === 'completed')
          if (canDoStatusChange) {
            handleSubStepStatusChange(activeId, overStatus)
          }
        }
      }
    },
    [
      canUpdateSubSteps,
      canMoveSubStepToCompleted,
      phaseStatus,
      sortedSubSteps,
      handleSubStepsReorder,
      handleSubStepStatusChange,
    ]
  )

  return {
    sensors,
    kanbanCollisionDetection,
    handleKanbanDragStart,
    handleKanbanDragOver,
    handleKanbanDragEnd,
  }
}
