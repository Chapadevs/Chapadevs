import { useState, useMemo } from 'react'
import { useAuth } from '../../../../../context/AuthContext'
import { projectAPI } from '../../../../../services/api'
import { calculatePermissions } from '../../utils/userPermissionsUtils'
import { getCalendarItems, getItemsForDate, toDateKey } from '../../../../../utils/calendarDateUtils'
import { formatDateOnly } from '../../../../../utils/dateUtils'
import { Calendar, Card, Badge } from '../../../../../components/ui-components'
import SubStepModal from '../../../../../components/modal-components/SubStepModal/SubStepModal'
import { TASK_STATUS_LABELS } from '../../utils/workspaceConstants'

const CalendarTab = ({ project, onPhaseUpdate }) => {
  const { user } = useAuth()
  const permissions = project && user ? calculatePermissions(user, project) : null
  const canUpdateSubSteps = permissions?.canUpdateSubSteps ?? false
  const canAnswerQuestion = permissions?.canAnswerQuestion ?? false
  const canAddQuestion = permissions?.canAddQuestion ?? false
  const canUploadAttachments = permissions?.canUploadAttachments ?? false

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [selectedSubStep, setSelectedSubStep] = useState(null)
  const [selectedPhase, setSelectedPhase] = useState(null)

  const calendarItems = useMemo(
    () => (project ? getCalendarItems(project) : { phases: [], subSteps: [], daysWithItems: new Set() }),
    [project]
  )

  const selectedDateKey = toDateKey(selectedDate)
  const { subSteps: subStepsForDay, phaseMilestones } = useMemo(
    () => getItemsForDate(selectedDateKey, calendarItems),
    [selectedDateKey, calendarItems]
  )

  const handleSubStepUpdate = async (subStepId, updates) => {
    if (!canUpdateSubSteps || !selectedPhase) return
    try {
      let updatedSubSteps = [...(selectedPhase.subSteps || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      const index = updatedSubSteps.findIndex(
        (s) => (s._id || s.id)?.toString() === subStepId?.toString()
      )
      if (index >= 0) {
        updatedSubSteps[index] = { ...updatedSubSteps[index], ...updates }
      } else {
        updatedSubSteps.push({ ...updates, order: updatedSubSteps.length + 1 })
      }
      const updated = await projectAPI.updatePhase(
        project._id || project.id,
        selectedPhase._id || selectedPhase.id,
        { subSteps: updatedSubSteps }
      )
      if (onPhaseUpdate) onPhaseUpdate(updated)
    } catch (_) {
      /* keep modal open on error */
    }
  }

  const handleQuestionAnswer = async (questionId, answer, subStepOrder = null) => {
    if (!canAnswerQuestion || !selectedPhase) return
    try {
      const updated = await projectAPI.answerQuestion(
        project._id || project.id,
        selectedPhase._id || selectedPhase.id,
        questionId,
        answer,
        subStepOrder
      )
      if (onPhaseUpdate) onPhaseUpdate(updated)
    } catch (_) {}
  }

  const handleOpenSubStep = (phase, subStep) => {
    setSelectedPhase(phase)
    setSelectedSubStep(subStep)
  }

  const hasPhases = project?.phases && project.phases.length > 0
  const hasAnyItems = calendarItems.subSteps.length > 0 || calendarItems.phases.length > 0

  const projectStartDateKey = project?.startDate ? toDateKey(project.startDate) : null
  const projectDueDateKey = project?.dueDate ? toDateKey(project.dueDate) : null

  const CalendarDayWithItems = useMemo(() => {
    const { daysWithItems, itemCountByDate } = calendarItems
    return function DayButton({ day, modifiers, className, ...props }) {
      const dateKey = toDateKey(day.date)
      const hasItems = daysWithItems.has(dateKey)
      const count = itemCountByDate?.get(dateKey) ?? 0
      const isSelected = modifiers?.selected
      const isProjectStartDate = projectStartDateKey && dateKey === projectStartDateKey
      const isProjectDueDate = projectDueDateKey && dateKey === projectDueDateKey
      const isProjectMilestone = isProjectStartDate || isProjectDueDate
      const dotClass = isSelected ? 'bg-primary-foreground' : 'bg-primary'
      const bgClass = isProjectMilestone
        ? ''
        : isSelected
          ? 'bg-primary text-primary-foreground'
          : modifiers?.today
            ? 'bg-accent text-accent-foreground'
            : ''
      const countClass = isSelected ? 'text-primary-foreground' : 'text-primary'
      const numberClass = isProjectStartDate ? 'text-primary' : isProjectDueDate ? 'text-red-600' : ''
      const ariaLabel = isProjectStartDate
        ? `${day.date.toLocaleDateString()} (Project start date)`
        : isProjectDueDate
          ? `${day.date.toLocaleDateString()} (Project end date)`
          : undefined
      return (
        <button
          type="button"
          {...props}
          className={`rdp-day_button flex aspect-square h-auto w-full min-w-[var(--cell-size)] flex-col gap-0.5 items-center justify-center rounded-none font-body text-sm font-normal leading-none transition-colors hover:bg-accent/60 hover:text-accent-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset disabled:opacity-50 ${bgClass} ${className || ''}`}
          data-day={day.date.toLocaleDateString()}
          aria-label={ariaLabel}
        >
          <span className={numberClass}>{day.date.getDate()}</span>
          {hasItems && !isProjectMilestone && (
            <span className="flex gap-0.5 justify-center items-center">
              {count > 1 ? (
                <span className={`text-[10px] font-heading ${countClass}`}>{count}</span>
              ) : (
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} aria-hidden />
              )}
            </span>
          )}
        </button>
      )
    }
  }, [calendarItems, projectStartDateKey, projectDueDateKey])

  if (!hasPhases) {
    return (
      <section className="project-section w-full">
        <div className="font-body text-ink-muted py-8 text-center">
          <p className="mb-2">No phases yet. Set up your workspace first.</p>
          <p className="text-sm">Go to the Workspace tab to create and confirm your project timeline.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="project-section project-phases w-full flex flex-col items-center">
      <h2 className="font-heading text-lg uppercase text-ink mb-4 w-full text-center">Project Calendar</h2>

      <div className="inline-flex flex-col items-stretch">
        <div className="sticky top-0 z-10 flex flex-col gap-2 p-2.5 pl-3 bg-surface rounded-none">
          <h3 className="font-heading text-xs uppercase text-ink">
            {selectedDateKey ? formatDateOnly(selectedDate, '—') : 'Select a date'}
          </h3>
          <div className="flex flex-wrap gap-2 items-start">
          {phaseMilestones.length > 0 && (
            <div>
              <span className="font-heading text-[0.65rem] uppercase text-ink-muted block mb-1">Phase milestones</span>
              <div className="flex flex-wrap gap-1.5">
                {phaseMilestones.map((item) => (
                  <div
                    key={item.phase._id || item.phase.id}
                    className="flex items-center justify-between gap-2 py-1 px-2 border border-border bg-background rounded-none font-body text-xs"
                  >
                    <span className="font-body text-xs truncate">{item.phase.title}</span>
                    <div className="flex shrink-0 gap-0.5">
                      {toDateKey(item.startDate) === selectedDateKey && (
                        <Badge variant="neutral" className="text-[0.6rem] !py-0 !px-1.5 !min-h-0">Start</Badge>
                      )}
                      {toDateKey(item.dueDate) === selectedDateKey && (
                        <Badge variant="neutral" className="text-[0.6rem] !py-0 !px-1.5 !min-h-0">Due</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {subStepsForDay.length > 0 ? (
            <div>
              <span className="font-heading text-[0.65rem] uppercase text-ink-muted block mb-1">Tasks</span>
              <div className="flex flex-wrap gap-1.5">
                {subStepsForDay.map((item) => {
                  const status = item.subStep.status ?? (item.subStep.completed ? 'completed' : 'pending')
                  return (
                    <Card
                      key={`${item.phase._id || item.phase.id}-${item.subStep.order}`}
                      variant="default"
                      className="p-2 cursor-pointer hover:border-primary transition-colors rounded-none min-w-[160px]"
                      onClick={() => handleOpenSubStep(item.phase, item.subStep)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleOpenSubStep(item.phase, item.subStep)
                        }
                      }}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-body text-xs truncate">{item.subStep.title || 'Untitled'}</span>
                        <Badge
                          variant={
                            status === 'completed' ? 'success' :
                            status === 'in_progress' ? 'development' :
                            status === 'client_approval' ? 'holding' : 'neutral'
                          }
                          className="shrink-0 text-[0.6rem] !py-0 !px-1.5 !min-h-0"
                        >
                          {TASK_STATUS_LABELS[status] || status}
                        </Badge>
                      </div>
                      <span className="font-body text-[0.65rem] text-ink-muted block mt-0.5">
                        {item.phase.title}
                      </span>
                    </Card>
                  )
                })}
              </div>
            </div>
          ) : (
            <div>
              <span className="font-heading text-[0.65rem] uppercase text-ink-muted block mb-1">Tasks</span>
              {selectedDateKey === projectDueDateKey ? (
                <p className="font-body text-xs text-red-700 py-1">Project ending</p>
              ) : !hasAnyItems ? (
                <p className="font-body text-xs text-ink-muted py-1">
                  No tasks with dates yet. Add due dates to sub-steps in the Workspace.
                </p>
              ) : (
                <p className="font-body text-xs text-ink-muted py-1">
                  No tasks on this day.
                </p>
              )}
            </div>
          )}
          </div>
        </div>

        <div className="border border-t-0 border-border rounded-none p-4 md:p-6 bg-surface">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => d && setSelectedDate(d)}
            defaultMonth={project?.dueDate ? new Date(project.dueDate) : undefined}
            className="rounded-none [--cell-size:4rem] text-base"
            classNames={{ today: 'rounded-none' }}
            components={{ DayButton: CalendarDayWithItems }}
          />
        </div>
      </div>

      <SubStepModal
        open={selectedSubStep != null}
        onClose={() => {
          setSelectedSubStep(null)
          setSelectedPhase(null)
        }}
        subStep={selectedSubStep}
        phase={selectedPhase}
        project={project}
        canEdit={canUpdateSubSteps}
        canUploadAttachments={canUploadAttachments}
        canEditRequiredAttachments={permissions?.canEditRequiredAttachments ?? false}
        canAnswerQuestion={canAnswerQuestion}
        canAddQuestion={canAddQuestion}
        userId={user?._id || user?.id}
        onUpdate={async (updates) => {
          await handleSubStepUpdate(selectedSubStep?._id ?? selectedSubStep?.id ?? null, updates)
          setSelectedSubStep(null)
          setSelectedPhase(null)
        }}
        onPhaseUpdate={(updated) => {
          if (selectedPhase && (updated._id || updated.id) === (selectedPhase._id || selectedPhase.id)) {
            setSelectedPhase(updated)
          }
          onPhaseUpdate?.(updated)
        }}
        onQuestionAnswer={handleQuestionAnswer}
      />
    </section>
  )
}

export default CalendarTab
