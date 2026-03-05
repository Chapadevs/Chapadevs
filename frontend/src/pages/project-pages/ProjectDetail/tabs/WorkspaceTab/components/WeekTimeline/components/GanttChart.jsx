import { STATUS_LABELS } from '../../../../../utils/workspaceConstants'

const MS_PER_DAY = 24 * 60 * 60 * 1000

function buildDateTicks(rangeStart, rangeEnd, rangeMs, toPercent) {
  const daysCount = Math.ceil(rangeMs / MS_PER_DAY)
  const tickStep = daysCount <= 7 ? 1 : daysCount <= 14 ? 2 : daysCount <= 31 ? 5 : 7
  const ticks = []
  const tickStart = new Date(rangeStart)
  tickStart.setHours(0, 0, 0, 0)
  const endMs = rangeEnd.getTime()
  for (let i = 0; i <= daysCount; i += tickStep) {
    const d = new Date(tickStart)
    d.setDate(d.getDate() + i)
    if (d.getTime() <= endMs) {
      const pct = toPercent(d)
      if (pct != null) ticks.push({ date: d, percent: pct })
    }
  }
  if (ticks.length > 0 && ticks[ticks.length - 1].percent < 100) {
    ticks.push({ date: rangeEnd, percent: 100 })
  }
  return ticks
}

function formatMonth(date) {
  if (!date || !(date instanceof Date) || Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { month: 'short' })
}

const STATUS_BAR_CLASSES = {
  pending: 'bg-amber-500/25',
  active: 'bg-blue-500/25',
  in_progress: 'bg-blue-500/25',
  waiting_client: 'bg-blue-500/25',
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
  const dateTicks = buildDateTicks(rangeStart, rangeEnd, rangeMs, toPercent)

  return (
    <div className="relative flex flex-col min-w-0 w-full">
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mb-1 font-body text-[10px] text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 inline-block rounded-none bg-blue-500/25 border border-border" />
          {STATUS_LABELS.in_progress}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 inline-block rounded-none bg-amber-500/25 border border-amber-600/50 border-dashed" />
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
            <span className="w-2 h-2 bg-ink border border-ink inline-block rounded-none" />
            Approve by
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="w-0.5 h-3 bg-primary inline-block" />
          Today
        </span>
      </div>
      <div className="relative h-4 bg-surface mb-0.5 flex items-center">
        <div
          className="absolute inset-y-0 left-0 bg-primary/25 transition-all duration-300 pointer-events-none"
          style={{ width: `${fillPercent}%` }}
          aria-hidden
        />
        {dateTicks.map((tick, i) => {
          const isFirst = i === 0
          const isLast = i === dateTicks.length - 1
          const transform = isFirst ? 'translateX(0)' : isLast ? 'translateX(-100%)' : 'translateX(-50%)'
          const align = isFirst ? 'items-start' : isLast ? 'items-end' : 'items-center'
          return (
            <div
              key={i}
              className={`absolute flex flex-col ${align} font-heading text-[10px] uppercase tracking-wide text-ink-muted z-10`}
              style={{ left: `${tick.percent}%`, transform }}
            >
              <span className="whitespace-nowrap text-[8px]">{formatMonth(tick.date)}</span>
              <span className="whitespace-nowrap">{tick.date.getDate()}</span>
            </div>
          )
        })}
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
            <span className="font-heading text-[10px] text-primary uppercase tracking-wide whitespace-nowrap">
              {dot.completedDate ? formatShortDate(dot.completedDate) : ''}
            </span>
            <span className="w-2 h-2 bg-primary rounded-none border border-primary block" />
          </button>
        ))}
      </div>
      {isLate && (
        <p className="font-heading text-xs text-amber-600 uppercase font-bold mb-1">
          You are LATE · {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
        </p>
      )}
      <div className="relative min-h-0">
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
              className="relative h-4 flex items-center mb-0.5 last:mb-0"
            >
              <button
                type="button"
                className={`
                  absolute top-0.5 bottom-0.5 border rounded-none
                  cursor-pointer transition-opacity hover:opacity-90
                  focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
                  ${isPending ? 'border-dashed border-amber-600/50' : 'border-border'}
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
                  className="absolute flex flex-col items-center z-10 cursor-pointer hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 top-0 bottom-0 justify-center"
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
                  <span className="font-heading text-[10px] text-ink uppercase tracking-wide whitespace-nowrap">
                    {m.dueDate ? `Approve by ${formatShortDate(m.dueDate)}` : ''}
                  </span>
                  <span className="w-2 h-2 bg-ink rounded-none border border-ink block" />
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
    </div>
  )
}

export default GanttChart
