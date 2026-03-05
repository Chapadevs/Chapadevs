import {
  getPhaseDateRange,
  getSubStepDateRange,
} from '@/utils/calendarDateUtils'
import { getSubStepStatus } from '../../../utils/workspaceUtils'
import { getCenterOfDayMs } from './WeekTimeline/utils'
import GanttChart from './WeekTimeline/components/GanttChart'
import RulerTrack from './WeekTimeline/components/RulerTrack'

const MS_PER_DAY = 24 * 60 * 60 * 1000

function formatShortDate(d) {
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
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
        <div className="flex flex-col gap-0.5 min-w-[220px] shrink-0 flex-shrink-0">
          {!hasContent ? (
            <p className="font-body text-xs text-ink-muted">No tasks with dates.</p>
          ) : (
            content
          )}
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-0.5 w-full">
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
      <div className="flex flex-col gap-0.5 min-w-[220px] shrink-0 flex-shrink-0">
        {rulerTrack}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5 w-full">
      {rulerTrack}
    </div>
  )
}

export default WeekTimeline
