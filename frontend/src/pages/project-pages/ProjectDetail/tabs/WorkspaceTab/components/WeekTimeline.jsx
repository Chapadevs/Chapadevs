import './WeekTimeline.css'

/**
 * Week timeline for a cycle (phase). Horizontal or vertical layout.
 * Derives week range from phase.startedAt/dueDate, or project start + phase order + estimatedDurationDays (legacy).
 * Shows progress highlight from week start to "today" or completedAt.
 */
const WeekTimeline = ({ phase, project, phases = [], vertical = false }) => {
  const projectStart = project?.startDate ? new Date(project.startDate) : null
  const order = phase?.order ?? 1
  const phaseStartedAt = phase?.startedAt ? new Date(phase.startedAt) : null
  const phaseDueDate = phase?.dueDate ? new Date(phase.dueDate) : null
  const phaseCompletedAt = phase?.completedAt ? new Date(phase.completedAt) : null
  const estimatedDurationDays = phase?.estimatedDurationDays ?? null
  const status = phase?.status

  let weekStart
  let weekEnd
  if (phaseStartedAt && phaseDueDate) {
    weekStart = phaseStartedAt
    weekEnd = phaseDueDate
  } else if (projectStart && (estimatedDurationDays != null || phases.length > 0)) {
    weekStart = new Date(projectStart)
    const prevDuration = Array.isArray(phases)
      ? phases
          .filter((p) => (p.order ?? 0) < order)
          .reduce((sum, p) => sum + (p.estimatedDurationDays ?? 7), 0)
      : (order - 1) * 7
    weekStart.setDate(weekStart.getDate() + prevDuration)
    const duration = estimatedDurationDays ?? 7
    weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + duration)
  } else if (projectStart) {
    weekStart = new Date(projectStart)
    weekStart.setDate(weekStart.getDate() + (order - 1) * 7)
    weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
  } else {
    weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let highlightEnd
  if (status === 'completed' && phaseCompletedAt) {
    highlightEnd = phaseCompletedAt.getTime()
  } else if (status === 'in_progress') {
    highlightEnd = Math.min(today.getTime(), weekEnd.getTime())
  } else {
    highlightEnd = weekStart.getTime()
  }

  const startMs = weekStart.getTime()
  const endMs = weekEnd.getTime()
  const rangeMs = endMs - startMs
  const fillEnd = Math.max(startMs, Math.min(highlightEnd, endMs))
  const fillPercent = rangeMs > 0 ? ((fillEnd - startMs) / rangeMs) * 100 : 0

  const days = []
  const dayLabel = new Date(weekStart)
  for (let i = 0; i < 7; i++) {
    days.push({
      date: new Date(dayLabel),
      label: dayLabel.getDate().toString(),
      shortMonth: dayLabel.toLocaleDateString('en-US', { month: 'short' }),
    })
    dayLabel.setDate(dayLabel.getDate() + 1)
  }

  if (vertical) {
    return (
      <div className="week-timeline week-timeline-vertical">
        <div className="week-timeline-track week-timeline-track-v">
          <div
            className="week-timeline-fill week-timeline-fill-v"
            style={{ height: `${fillPercent}%` }}
            aria-hidden
          />
          <div className="week-timeline-days week-timeline-days-v">
            {days.map((d, i) => (
              <div key={i} className="week-timeline-day week-timeline-day-v">
                <span className="week-timeline-day-label py-2">
                  {d.label} {d.shortMonth}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="week-timeline week-timeline-horizontal">
      <h3 className="week-timeline-title font-heading text-sm text-ink uppercase tracking-wide">
        Week timeline
      </h3>
      <div className="week-timeline-track-h">
        <div className="week-timeline-days-h">
          {days.map((d, i) => (
            <div key={i} className="week-timeline-day-h">
              <span className="week-timeline-day-label-h">
                {d.label} {d.shortMonth}
              </span>
            </div>
          ))}
        </div>
        <div
          className="week-timeline-fill-h"
          style={{ width: `${fillPercent}%` }}
          aria-hidden
        />
      </div>
    </div>
  )
}

export default WeekTimeline
