import { useDroppable } from '@dnd-kit/core'
import KanbanSubStep from '../KanbanSubStep/KanbanSubStep'
import { Button } from '@/components/ui-components'

/**
 * Kanban column: droppable area for a status. Renders header + cards.
 */
const KanbanColumn = ({
  status,
  label,
  cards,
  onOpen,
  renderCardChildren,
  getCanDragForCard,
  onAddTask,
  showAddTask,
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
      <div ref={setNodeRef} className="phase-cycle-kanban-column-cards min-h-[120px] flex flex-col">
        {cards.length === 0 ? (
          <div className="flex-1 flex flex-col justify-end gap-2 pb-2" aria-hidden>
            <span className="text-ink-muted text-sm text-center">Drop here</span>
            {showAddTask && onAddTask && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onAddTask(status)}
                className="!py-1 !px-2 text-xs w-full"
              >
                + Add task
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto">
              {cards.map((subStep, index) => {
                const stepStatus = subStep.status ?? (subStep.completed ? 'completed' : 'pending')
                const cardVariant = `substep-card--${stepStatus.replace('_', '-')}`
                const canDrag = getCanDragForCard ? getCanDragForCard(subStep) : true
                return (
                  <KanbanSubStep
                    key={subStep._id || subStep.id || index}
                    subStep={subStep}
                    cardVariant={cardVariant}
                    canDrag={canDrag}
                    onOpen={() => onOpen(subStep)}
                  >
                    {renderCardChildren?.(subStep)}
                  </KanbanSubStep>
                )
              })}
            </div>
            {showAddTask && onAddTask && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onAddTask(status)}
                className="shrink-0 !py-1 !px-2 text-xs w-full"
              >
                + Add task
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default KanbanColumn
