import { useDroppable } from '@dnd-kit/core'
import KanbanSubStep from '../KanbanSubStep/KanbanSubStep'

/**
 * Kanban column: droppable area for a status. Renders header + cards.
 */
const KanbanColumn = ({
  status,
  label,
  cards,
  onOpen,
  renderCardChildren,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
  })

  return (
    <div className={`phase-cycle-kanban-column ${isOver ? 'phase-cycle-kanban-column--over' : ''}`}>
      <div className="phase-cycle-kanban-column-header">
        <span className="font-heading text-xs uppercase tracking-wide">{label}</span>
        <span className="phase-cycle-kanban-column-count">{cards.length}</span>
      </div>
      <div ref={setNodeRef} className="phase-cycle-kanban-column-cards min-h-[120px]">
        {cards.length === 0 ? (
          <div className="min-h-[120px] flex items-center justify-center text-ink-muted text-sm" aria-hidden>
            Drop here
          </div>
        ) : (
          cards.map((subStep, index) => {
            const stepStatus = subStep.status ?? (subStep.completed ? 'completed' : 'pending')
            const cardVariant = `substep-card--${stepStatus.replace('_', '-')}`
            return (
              <KanbanSubStep
                key={subStep._id || subStep.id || index}
                subStep={subStep}
                cardVariant={cardVariant}
                onOpen={() => onOpen(subStep)}
              >
                {renderCardChildren?.(subStep)}
              </KanbanSubStep>
            )
          })
        )}
      </div>
    </div>
  )
}

export default KanbanColumn
