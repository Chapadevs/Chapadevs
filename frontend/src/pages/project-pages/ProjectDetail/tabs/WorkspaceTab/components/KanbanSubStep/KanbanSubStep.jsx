import { useDraggable, useDroppable } from '@dnd-kit/core'
import SubStep from '../SubStep'

/**
 * Draggable and droppable SubStep card for Kanban.
 * useDraggable: cross-column drag. useDroppable: receive drops for same-column reorder.
 */
const KanbanSubStep = ({ subStep, cardVariant, onOpen, children }) => {
  const id = String(subStep._id ?? subStep.id ?? `substep-${subStep.order ?? 0}`)
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
    isDragging,
  } = useDraggable({
    id,
    data: {
      subStep,
      status: subStep?.status ?? (subStep?.completed ? 'completed' : 'pending'),
    },
  })
  const { setNodeRef: setDroppableRef } = useDroppable({ id })
  const setNodeRef = (node) => {
    setDraggableRef(node)
    setDroppableRef(node)
  }

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : { opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} className="phase-cycle-kanban-card">
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="flex-shrink-0 mt-5 cursor-grab active:cursor-grabbing text-ink-muted hover:text-ink p-1 -ml-1 rounded-none touch-none"
          aria-label="Drag to reorder or change status"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="opacity-60">
            <circle cx="5" cy="4" r="1.5" />
            <circle cx="11" cy="4" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="12" r="1.5" />
            <circle cx="11" cy="12" r="1.5" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <SubStep subStep={subStep} cardVariant={cardVariant} onOpen={onOpen}>
            {children}
          </SubStep>
        </div>
      </div>
    </div>
  )
}

export default KanbanSubStep
