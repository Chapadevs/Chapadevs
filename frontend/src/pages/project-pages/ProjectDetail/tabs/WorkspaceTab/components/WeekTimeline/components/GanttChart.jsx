import { Fragment } from 'react'
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
  pending: 'bg-primary/10 border-0',
  active: 'bg-primary/55 border-border',
  in_progress: 'bg-primary/55 border-border',
  client_approval: 'bg-primary/55 border-border',
  completed: 'bg-primary/20',
}

const TODAY_BALL_CLASSES =
  'w-2 h-2 rounded-full bg-primary shadow-[0_0_0_1px_rgba(5,150,105,0.9),0_0_6px_2px_rgba(5,150,105,0.9)]'

/**
 * Gantt chart: single green bar with status segments (opacity-based).
 * Completed sub-steps shown below the bar (like "Approve by"), one per task, clickable.
 * Client approval shown as "Approve by" label at due date.
 * Today marker as green ball with outer glow.
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
  allSubStepsCompleted = false,
}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const effectiveTodayPercent = isLate ? 100 : (todayPercent ?? 0)
  const dateTicks = buildDateTicks(rangeStart, rangeEnd, rangeMs, toPercent)

  return (
    <div className="relative flex flex-col min-w-0 w-full pr-2">
      <div className="relative flex flex-col">
        <div className="relative min-h-[1.5rem] flex items-start mb-0 z-30 overflow-hidden">
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
                <span className="whitespace-nowrap font-bold">{tick.date.getDate()}</span>
              </div>
            )
          })}
          {approvalDueMarkers?.map((m, idx) => {
            const pct = m.percent ?? 0
            const transform = pct <= 0 ? 'translateX(0)' : pct >= 100 ? 'translateX(-100%)' : 'translateX(-50%)'
            const alignClass = pct <= 0 ? 'items-start' : pct >= 100 ? 'items-end' : 'items-center'
            return (
            <button
              key={`approval-label-${m.subStep?._id || m.subStep?.id || idx}`}
              type="button"
              className={`absolute flex flex-col ${alignClass} font-heading text-[8px] text-primary uppercase tracking-wide z-10 cursor-pointer hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1`}
              style={{
                left: `${pct}%`,
                transform,
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
              <span className="whitespace-nowrap">
                {m.dueDate ? `Approve by ${formatShortDate(m.dueDate)}` : ''}
              </span>
            </button>
            )
          })}
        </div>
        {!allSubStepsCompleted && (
        <div className="relative h-4 bg-primary/20 mb-0.5 flex items-center z-0">
        {(completionDots ?? []).length === 0 && (
        <div
          className="absolute inset-y-0 left-0 bg-primary/25 transition-all duration-300 pointer-events-none"
          style={{ width: `${fillPercent}%` }}
          aria-hidden
        />
        )}
        {[...ganttRows]
          .sort((a) => (a.status === 'pending' ? -1 : 1))
          .map((row) => {
            const { status, startPercent, duePercent, subSteps } = row
            const left = startPercent ?? 0
            const widthPercent =
              duePercent != null && startPercent != null
                ? Math.max(duePercent - startPercent, 2)
                : 2
            const barClass = STATUS_BAR_CLASSES[status] ?? STATUS_BAR_CLASSES.pending
            const statusLabel = STATUS_LABELS[status] ?? status
            const firstSubStep = subSteps?.[0]
            const count = subSteps?.length ?? 0
            const isActive =
              status === 'active' || status === 'in_progress' || status === 'client_approval'

            return (
              <Fragment key={status}>
                <button
                  type="button"
                  className={`
                    absolute top-0.5 bottom-0.5 border rounded-none
                    cursor-pointer transition-opacity hover:opacity-90
                    focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
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
                {isActive && (
                  <>
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
                      style={{
                        left: `${left}%`,
                        transform: left <= 0 ? 'translateX(0)' : 'translateX(-50%)',
                      }}
                      aria-hidden
                    />
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
                      style={{
                        left: `${left + widthPercent}%`,
                        transform: left + widthPercent >= 100 ? 'translateX(-100%)' : 'translateX(-50%)',
                      }}
                      aria-hidden
                    />
                  </>
                )}
              </Fragment>
            )
          })}
        {effectiveTodayPercent > 0 && (
          <div
            className={`absolute top-1/2 z-10 pointer-events-none ${TODAY_BALL_CLASSES}`}
            style={{
              left: `${Math.min(effectiveTodayPercent, 100)}%`,
              transform: 'translate(-50%, -50%)',
            }}
            title={`Today: ${formatShortDate(today)}${isLate ? ' (overdue)' : ''}`}
            aria-hidden
          />
        )}
        </div>
        )}
        {(completionDots ?? []).length > 0 && (() => {
          const byDate = (completionDots ?? []).reduce((acc, dot) => {
            const key = dot.completedDate && !Number.isNaN(dot.completedDate.getTime())
              ? dot.completedDate.toDateString()
              : String(dot.percent ?? 0)
            if (!acc[key]) acc[key] = { percent: dot.percent ?? 0, dateStr: dot.completedDate ? formatShortDate(dot.completedDate) : '', count: 0, firstDot: dot }
            acc[key].count += 1
            return acc
          }, {})
          const groups = Object.values(byDate)
          return (
            <div className="relative min-h-[1.25rem] flex items-start mt-0.5 z-10 overflow-hidden">
              {groups.map((g, i) => {
                const label = `Completed ${g.dateStr}: ${g.count} task${g.count !== 1 ? 's' : ''}`
                const pct = g.percent ?? 0
                const transform = pct <= 0 ? 'translateX(0)' : pct >= 100 ? 'translateX(-100%)' : 'translateX(-50%)'
                const alignClass = pct <= 0 ? 'items-start' : pct >= 100 ? 'items-end' : 'items-center'
                return (
                  <button
                    key={`completed-${g.dateStr}-${i}`}
                    type="button"
                    className={`absolute flex flex-col ${alignClass} font-heading text-[8px] text-primary uppercase tracking-wide z-10 cursor-pointer hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1`}
                    style={{
                      left: `${pct}%`,
                      transform,
                    }}
                    onClick={() => onBarClick?.(g.firstDot.subStep)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onBarClick?.(g.firstDot.subStep)
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={label}
                    title={label}
                  >
                    <span className="whitespace-nowrap">
                      {label}
                    </span>
                  </button>
                )
              })}
            </div>
          )
        })()}
      </div>
      {isLate && (
        <p className="font-heading text-xs text-amber-600 uppercase font-bold mb-1">
          You are LATE · {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
        </p>
      )}
    </div>
  )
}

export default GanttChart
