import { useDraggable, useDroppable } from '@dnd-kit/core'
import SubStep from '../SubStep'

/**
 * Draggable and droppable SubStep card for Kanban.
 * useDraggable: cross-column drag. useDroppable: receive drops for same-column reorder.
 * canDrag: when false, card is not draggable (e.g. client can only drag client_approval -> completed).
 */
const KanbanSubStep = ({ subStep, cardVariant, canDrag = true, onOpen, children }) => {
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
    disabled: !canDrag,
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
    <div
      ref={setNodeRef}
      style={style}
      className={`phase-cycle-kanban-card ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
      {...(canDrag ? { ...attributes, ...listeners } : {})}
      aria-label={canDrag ? 'Drag to reorder or change status. Click to open.' : undefined}
    >
      <SubStep subStep={subStep} cardVariant={cardVariant} onOpen={onOpen}>
        {children}
      </SubStep>
    </div>
  )
}

export default KanbanSubStep
