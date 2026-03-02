import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import SubStep from '../SubStep'

/**
 * Wraps SubStep with sortable drag-and-drop. Used in CycleDetail for Create Steps cards.
 */
const SortableSubStep = ({ subStep, cardVariant, onOpen, children }) => {
  const id = subStep._id || subStep.id || `substep-${subStep.order ?? 0}`
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="mb-2">
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="flex-shrink-0 mt-5 cursor-grab active:cursor-grabbing text-ink-muted hover:text-ink p-1 -ml-1 rounded-none touch-none"
          aria-label="Drag to reorder"
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

export default SortableSubStep
