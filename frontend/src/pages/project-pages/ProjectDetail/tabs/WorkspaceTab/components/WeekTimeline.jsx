import {
  getPhaseDateRange,
  getSubStepDateRange,
} from '@/utils/calendarDateUtils'

const MS_PER_DAY = 24 * 60 * 60 * 1000

const STATUS_BAR_CLASSES = {
  pending: 'bg-ink-muted/20',
  active: 'bg-blue-500/25',
  in_progress: 'bg-blue-500/25',
  waiting_client: 'bg-amber-500/25',
  completed: 'bg-primary/20',
}

const STATUS_LABELS = {
  pending: 'Pending',
  active: 'In progress / Waiting on client',
  in_progress: 'In progress',
  waiting_client: 'Waiting on client',
  completed: 'Completed',
}

const STATUS_ORDER = ['pending', 'in_progress', 'waiting_client', 'completed']

function formatShortDate(d) {
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

function getSubStepStatus(s) {
  return s?.status ?? (s?.completed ? 'completed' : 'pending')
}

/** Returns ms at noon (center) of the given date's day for consistent day positioning. */
function getCenterOfDayMs(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime() + MS_PER_DAY / 2
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
      {/* Phase progress strip - at the very top, with dates on the bar */}
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
      {/* Gantt rows - one per status, concatenated */}
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
        {/* Today marker - vertical line; stops at 100% when overdue */}
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
      {/* Legend */}
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

/**
 * Ruler-style timeline: phase progress, today marker, sub-step pins (legacy).
 */
function RulerTrack({
  rangeStart,
  rangeEnd,
  rangeMs,
  fillPercent,
  todayPercent,
  subStepMarkers,
  ticks,
  today,
  formatShortDate,
}) {
  return (
    <div className="relative flex flex-col min-w-0 w-full">
      <div className="flex justify-between font-body text-xs text-ink font-medium mb-1">
        <span className="font-heading uppercase tracking-wide">
          {formatShortDate(rangeStart)}
        </span>
        <span className="font-heading uppercase tracking-wide">
          {formatShortDate(rangeEnd)}
        </span>
      </div>
      <div
        className="relative h-10 border border-border overflow-visible bg-surface min-h-[40px]"
        role="img"
        aria-label={`Phase timeline from ${formatShortDate(rangeStart)} to ${formatShortDate(rangeEnd)}`}
      >
        <div
          className="absolute inset-y-0 left-0 bg-primary/25 transition-all duration-300 pointer-events-none"
          style={{ width: `${fillPercent}%` }}
          aria-hidden
        />
        {ticks.map((t, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-border"
            style={{ left: `${t.percent}%` }}
            aria-hidden
          />
        ))}
        {todayPercent != null && todayPercent > 0 && todayPercent < 100 && (
          <div
            className="absolute top-0 bottom-0 flex flex-col items-center z-20"
            style={{ left: `${todayPercent}%`, transform: 'translateX(-50%)' }}
          >
            <div
              className="w-1 h-full min-h-[24px] bg-primary"
              title={`Today: ${formatShortDate(today)}`}
            />
            <span className="font-heading text-[10px] text-primary uppercase font-bold mt-0.5 whitespace-nowrap">
              Today
            </span>
          </div>
        )}
        {subStepMarkers.map((m) => (
          <span key={m.id} className="contents">
            {m.startPercent != null && (
              <div
                className="absolute top-0 flex flex-col items-center z-10"
                style={{ left: `${m.startPercent}%`, transform: 'translateX(-50%)' }}
                title={`${m.title} starts ${m.startDate ? formatShortDate(m.startDate) : ''}`}
              >
                <div className="w-1.5 h-5 bg-amber-600 border-l-2 border-amber-700" />
              </div>
            )}
            {m.duePercent != null &&
              (m.startPercent === m.duePercent ? null : (
                <div
                  className="absolute bottom-0 flex flex-col items-center z-10"
                  style={{ left: `${m.duePercent}%`, transform: 'translateX(-50%)' }}
                  title={`${m.title} due ${m.dueDate ? formatShortDate(m.dueDate) : ''}`}
                >
                  <div className="w-1.5 h-5 bg-amber-600 border-r-2 border-amber-700" />
                </div>
              ))}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 font-body text-[10px] text-ink-muted">
        {subStepMarkers.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-1 h-3 bg-amber-600 inline-block" />
            Sub-step dates
          </span>
        )}
        {todayPercent != null && todayPercent > 0 && todayPercent < 100 && (
          <span className="flex items-center gap-1.5">
            <span className="w-0.5 h-3 bg-primary inline-block" />
            Today
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Compact ruler or Gantt-style timeline for a phase.
 * mode='gantt': bars per sub-step, status colors, onBarClick.
 * mode='ruler': legacy pin-based layout.
 */
const WeekTimeline = ({
  phase,
  project,
  phases = [],
  vertical = false,
  mode = 'gantt',
  onBarClick,
}) => {
  const phaseCompletedAt = phase?.completedAt ? new Date(phase.completedAt) : null
  const status = phase?.status

  const { startDate: phaseStart, dueDate: phaseDue } = getPhaseDateRange(
    phase,
    project,
    phases
  )

  const rangeStart = phaseStart || (() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay())
    return d
  })()
  const rangeEnd = phaseDue || (() => {
    const d = new Date(rangeStart)
    d.setDate(d.getDate() + 6)
    return d
  })()

  const startMs = rangeStart.getTime()
  const endMs = rangeEnd.getTime()
  const rangeMs = Math.max(endMs - startMs, MS_PER_DAY)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayMs = today.getTime()

  const toPercent = (date) => {
    if (!date) return null
    const ms = new Date(date).getTime()
    if (ms <= startMs) return 0
    if (ms >= endMs) return 100
    return ((ms - startMs) / rangeMs) * 100
  }

  const subSteps = [...(phase?.subSteps || [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  )

  const completedSubStepsForFill = subSteps.filter((ss) => getSubStepStatus(ss) === 'completed')
  const allSubStepsCompleted = completedSubStepsForFill.length === subSteps.length && subSteps.length > 0

  let highlightEnd
  if (status === 'completed' && phaseCompletedAt && allSubStepsCompleted) {
    highlightEnd = phaseCompletedAt.getTime()
  } else if (completedSubStepsForFill.length > 0) {
    const latestCompletedMs = Math.max(
      ...completedSubStepsForFill.map((ss) => {
        const d = ss.completedAt ? new Date(ss.completedAt) : (ss.dueDate ? new Date(ss.dueDate) : null)
        return d && !Number.isNaN(d.getTime()) ? d.getTime() : startMs
      })
    )
    highlightEnd = Math.min(Math.max(latestCompletedMs, startMs), endMs)
  } else {
    highlightEnd = startMs
  }

  const fillEnd = Math.max(startMs, Math.min(highlightEnd, endMs))
  const fillPercent = ((fillEnd - startMs) / rangeMs) * 100

  const todayPercent = toPercent(getCenterOfDayMs(today))
  const isLate = todayMs > endMs
  const daysOverdue = isLate ? Math.floor((todayMs - endMs) / MS_PER_DAY) : 0

  if (mode === 'gantt') {
    const rowsByStatus = subSteps.reduce((acc, ss, i) => {
      const st = getSubStepStatus(ss)
      if (st === 'completed') return acc
      if (!acc[st]) acc[st] = { status: st, subSteps: [], startPercents: [], duePercents: [] }
      const { startDate: ssStart, dueDate: ssDue } = getSubStepDateRange(
        ss,
        phase,
        project,
        phases,
        i,
        subSteps.length
      )
      const startP = toPercent(ssStart)
      const dueP = toPercent(ssDue)
      if (startP == null && dueP == null) return acc
      acc[st].subSteps.push(ss)
      acc[st].startPercents.push(startP ?? 0)
      acc[st].duePercents.push(dueP ?? 100)
      return acc
    }, {})

    const activeInProgress = rowsByStatus.in_progress
    const activeWaiting = rowsByStatus.waiting_client
    const activeSubSteps = [...(activeInProgress?.subSteps ?? []), ...(activeWaiting?.subSteps ?? [])]
    const activeStartPercents = [...(activeInProgress?.startPercents ?? []), ...(activeWaiting?.startPercents ?? [])]
    const activeDuePercents = [...(activeInProgress?.duePercents ?? []), ...(activeWaiting?.duePercents ?? [])]

    const ganttRows = []
    if (activeSubSteps.length > 0 && (activeStartPercents.length > 0 || activeDuePercents.length > 0)) {
      ganttRows.push({
        status: 'active',
        startPercent: Math.min(...activeStartPercents),
        duePercent: Math.max(...activeDuePercents),
        subSteps: activeSubSteps,
      })
    }
    if (rowsByStatus.pending) {
      ganttRows.push({
        status: 'pending',
        startPercent: Math.min(...rowsByStatus.pending.startPercents),
        duePercent: Math.max(...rowsByStatus.pending.duePercents),
        subSteps: rowsByStatus.pending.subSteps,
      })
    }

    const completedSubSteps = subSteps.filter((ss) => getSubStepStatus(ss) === 'completed')
    const completionDots = completedSubSteps
      .map((ss) => {
        const completedDate = ss.completedAt ? new Date(ss.completedAt) : (ss.dueDate ? new Date(ss.dueDate) : null)
        if (!completedDate || Number.isNaN(completedDate.getTime())) return null
        const pct = toPercent(getCenterOfDayMs(completedDate))
        if (pct == null) return null
        return { subStep: ss, completedDate, percent: pct }
      })
      .filter(Boolean)

    const waitingClientSubSteps = subSteps.filter((ss) => getSubStepStatus(ss) === 'waiting_client')
    const approvalDueMarkers = waitingClientSubSteps
      .map((ss) => {
        const dueDate = ss.dueDate ? new Date(ss.dueDate) : null
        if (!dueDate || Number.isNaN(dueDate.getTime())) return null
        const pct = toPercent(getCenterOfDayMs(dueDate))
        if (pct == null) return null
        return { subStep: ss, dueDate, percent: pct }
      })
      .filter(Boolean)

    const hasContent = ganttRows.length > 0 || completionDots.length > 0 || approvalDueMarkers.length > 0

    const content = (
      <GanttChart
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        startMs={startMs}
        endMs={endMs}
        rangeMs={rangeMs}
        ganttRows={ganttRows}
        completionDots={completionDots}
        approvalDueMarkers={approvalDueMarkers}
        todayPercent={todayPercent}
        fillPercent={fillPercent}
        isLate={isLate}
        daysOverdue={daysOverdue}
        onBarClick={onBarClick}
        formatShortDate={formatShortDate}
        toPercent={toPercent}
      />
    )

    if (vertical) {
      return (
        <div className="flex flex-col gap-1 min-w-[220px] shrink-0 flex-shrink-0">
          <h3 className="font-heading text-xs text-ink uppercase tracking-wide">
            Timeline
          </h3>
          {!hasContent ? (
            <p className="font-body text-xs text-ink-muted">No tasks with dates.</p>
          ) : (
            content
          )}
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-1 w-full">
        <h3 className="font-heading text-sm text-ink uppercase tracking-wide">
          Timeline
        </h3>
        {!hasContent ? (
          <p className="font-body text-xs text-ink-muted">No tasks with dates.</p>
        ) : (
          content
        )}
      </div>
    )
  }

  // Ruler mode - exclude completed and waiting_client (waiting_client shown as dot in gantt only)
  const nonCompletedSubSteps = subSteps
    .map((ss, i) => ({ ss, originalIndex: i }))
    .filter(({ ss }) => {
      const st = getSubStepStatus(ss)
      return st !== 'completed' && st !== 'waiting_client'
    })
  const subStepMarkers = nonCompletedSubSteps
    .map(({ ss, originalIndex }) => {
      const { startDate: ssStart, dueDate: ssDue } = getSubStepDateRange(
        ss,
        phase,
        project,
        phases,
        originalIndex,
        subSteps.length
      )
      return {
        id: ss._id || ss.id || `ss-${originalIndex}`,
        title: ss.title || `Step ${originalIndex + 1}`,
        startDate: ssStart,
        dueDate: ssDue,
        startPercent: toPercent(ssStart),
        duePercent: toPercent(ssDue),
      }
    })
    .filter((m) => m.startPercent != null || m.duePercent != null)

  const daysCount = Math.ceil(rangeMs / MS_PER_DAY)
  const tickStep = daysCount <= 7 ? 1 : daysCount <= 14 ? 2 : daysCount <= 31 ? 5 : 7
  const ticks = []
  const tickStart = new Date(rangeStart)
  for (let i = 0; i <= daysCount; i += tickStep) {
    const d = new Date(tickStart)
    d.setDate(d.getDate() + i)
    if (d.getTime() <= endMs) {
      ticks.push({ date: d, percent: toPercent(d) })
    }
  }
  if (ticks.length > 0 && ticks[ticks.length - 1].percent < 100) {
    ticks.push({ date: rangeEnd, percent: 100 })
  }

  const rulerTrack = (
    <RulerTrack
      rangeStart={rangeStart}
      rangeEnd={rangeEnd}
      rangeMs={rangeMs}
      fillPercent={fillPercent}
      todayPercent={todayPercent}
      subStepMarkers={subStepMarkers}
      ticks={ticks}
      today={today}
      formatShortDate={formatShortDate}
    />
  )

  if (vertical) {
    return (
      <div className="flex flex-col gap-1 min-w-[220px] shrink-0 flex-shrink-0">
        <h3 className="font-heading text-xs text-ink uppercase tracking-wide">
          Timeline
        </h3>
        {rulerTrack}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      <h3 className="font-heading text-sm text-ink uppercase tracking-wide">
        Timeline
      </h3>
      {rulerTrack}
    </div>
  )
}

export default WeekTimeline
