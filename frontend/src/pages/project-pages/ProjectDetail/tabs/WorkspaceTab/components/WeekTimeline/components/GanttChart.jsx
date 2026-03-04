import { STATUS_LABELS } from '../../../../../utils/workspaceConstants'

const STATUS_BAR_CLASSES = {
  pending: 'bg-ink-muted/20',
  active: 'bg-blue-500/25',
  in_progress: 'bg-blue-500/25',
  waiting_client: 'bg-amber-500/25',
  completed: 'bg-primary/20',
}

/**
 * Gantt chart: one row per status (excluding completed, waiting_client) with concatenated bar.
 * Completed sub-steps shown as dots on completion day.
 * Waiting on client shown as single "Approve by" dot at due date.
 * Today marker; late banner when overdue.
 */
function GanttChart({
  rangeStart,
  rangeEnd,
  startMs,
  endMs,
  rangeMs,
  ganttRows,
  completionDots,
  approvalDueMarkers,
  todayPercent,
  fillPercent,
  isLate,
  daysOverdue,
  onBarClick,
  formatShortDate,
  toPercent,
}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const effectiveTodayPercent = isLate ? 100 : (todayPercent ?? 0)

  return (
    <div className="relative flex flex-col min-w-0 w-full">
      <div className="relative min-h-[24px] border border-border bg-surface mb-1 flex items-center">
        <div
          className="absolute inset-y-0 left-0 bg-primary/25 transition-all duration-300 pointer-events-none"
          style={{ width: `${fillPercent}%` }}
          aria-hidden
        />
        <span className="absolute left-0 font-heading text-[10px] uppercase tracking-wide text-ink-muted z-10">
          {formatShortDate(rangeStart)}
        </span>
        {completionDots?.map((dot, idx) => (
          <button
            key={`bar-completed-${dot.subStep?._id || dot.subStep?.id || idx}`}
            type="button"
            className="absolute flex flex-col items-center z-10 cursor-pointer hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
            style={{
              left: `${dot.percent}%`,
              transform: 'translateX(-50%)',
            }}
            onClick={() => onBarClick?.(dot.subStep)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onBarClick?.(dot.subStep)
              }
            }}
            tabIndex={0}
            role="button"
            aria-label={`Completed: ${dot.subStep?.title || 'Task'}. Click to open.`}
            title={`Completed ${dot.completedDate ? formatShortDate(dot.completedDate) : ''}: ${dot.subStep?.title || ''}`}
          >
            <span className="w-2 h-2 bg-primary rounded-none border border-primary block" />
            <span className="font-heading text-[10px] text-primary uppercase tracking-wide whitespace-nowrap">
              {dot.completedDate ? formatShortDate(dot.completedDate) : ''}
            </span>
          </button>
        ))}
        <span className="absolute right-0 font-heading text-[10px] uppercase tracking-wide text-ink-muted z-10">
          {formatShortDate(rangeEnd)}
        </span>
      </div>
      {isLate && (
        <p className="font-heading text-xs text-amber-600 uppercase font-bold mb-1">
          You are LATE · {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
        </p>
      )}
      <div className="relative min-h-[32px]">
        {ganttRows.map((row, idx) => {
          const { status, startPercent, duePercent, subSteps } = row
          const left = startPercent ?? 0
          const widthPercent = duePercent != null && startPercent != null
            ? Math.max(duePercent - startPercent, 2)
            : 2
          const barClass = STATUS_BAR_CLASSES[status] ?? STATUS_BAR_CLASSES.pending
          const isPending = status === 'pending'
          const statusLabel = STATUS_LABELS[status] ?? status
          const firstSubStep = subSteps?.[0]
          const count = subSteps?.length ?? 0

          return (
            <div
              key={status}
              className="relative h-6 flex items-center mb-1"
            >
              <button
                type="button"
                className={`
                  absolute top-0.5 bottom-0.5 border border-border rounded-none
                  cursor-pointer transition-opacity hover:opacity-90
                  focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
                  ${isPending ? 'border-dashed' : ''}
                  ${barClass}
                `}
                style={{
                  left: `${left}%`,
                  width: `${widthPercent}%`,
                  minWidth: '8px',
                }}
                onClick={() => firstSubStep && onBarClick?.(firstSubStep)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && firstSubStep) {
                    e.preventDefault()
                    onBarClick?.(firstSubStep)
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`${statusLabel}: ${count} task${count !== 1 ? 's' : ''}. Click to open.`}
              />
              {status === 'active' && approvalDueMarkers?.map((m, idx) => (
                <button
                  key={`active-bar-approval-${m.subStep?._id || m.subStep?.id || idx}`}
                  type="button"
                  className="absolute flex flex-col items-center z-10 cursor-pointer hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 top-0 bottom-0 justify-center"
                  style={{
                    left: `${m.percent}%`,
                    transform: 'translateX(-50%)',
                  }}
                  onClick={() => onBarClick?.(m.subStep)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onBarClick?.(m.subStep)
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Approve by ${m.dueDate ? formatShortDate(m.dueDate) : ''}: ${m.subStep?.title || 'Task'}. Click to open.`}
                  title={`Approve by ${m.dueDate ? formatShortDate(m.dueDate) : ''}: ${m.subStep?.title || ''}`}
                >
                  <span className="w-2 h-2 bg-amber-500 rounded-none border border-amber-600 block" />
                  <span className="font-heading text-[10px] text-amber-600 uppercase tracking-wide whitespace-nowrap">
                    {m.dueDate ? `Approve by ${formatShortDate(m.dueDate)}` : ''}
                  </span>
                </button>
              ))}
            </div>
          )
        })}
        {effectiveTodayPercent > 0 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
            style={{
              left: `${Math.min(effectiveTodayPercent, 100)}%`,
              transform: 'translateX(-50%)',
            }}
            title={`Today: ${formatShortDate(today)}${isLate ? ' (overdue)' : ''}`}
            aria-hidden
          />
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 font-body text-[10px] text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 inline-block rounded-none bg-blue-500/25 border border-border" />
          {STATUS_LABELS.active}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 inline-block rounded-none bg-ink-muted/20 border border-border border-dashed" />
          {STATUS_LABELS.pending}
        </span>
        {completionDots?.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-primary border border-primary inline-block rounded-none" />
            Completed
          </span>
        )}
        {approvalDueMarkers?.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-amber-500 border border-amber-600 inline-block rounded-none" />
            Approve by
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="w-0.5 h-3 bg-primary inline-block" />
          Today
        </span>
      </div>
    </div>
  )
}

export default GanttChart
