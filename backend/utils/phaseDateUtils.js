const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Parse date as calendar day (extracts YYYY-MM-DD from strings to avoid timezone shift).
 * Returns UTC midnight for that day so persisted dates are consistent.
 */
function toDateUtc(v) {
  if (!v) return null
  if (typeof v === 'string') {
    const match = v.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const y = Number(match[1])
      const m = Number(match[2]) - 1
      const d = Number(match[3])
      const date = new Date(Date.UTC(y, m, d))
      return Number.isNaN(date.getTime()) ? null : date
    }
    const d = new Date(v)
    return d && !Number.isNaN(d.getTime()) ? d : null
  }
  const d = v instanceof Date ? v : new Date(v)
  return d && !Number.isNaN(d.getTime()) ? d : null
}

/**
 * Derive phase startedAt and dueDate from sub-steps.
 * Timeline range always uses min start / max due (not completedAt), so the end date
 * reflects the biggest due date even when tasks are completed earlier.
 * @param {Array} subSteps - Sub-steps with startDate, dueDate, estimatedDurationDays, order
 * @returns {{ startedAt: Date | null, dueDate: Date | null }}
 */
export function derivePhaseDatesFromSubSteps(subSteps) {
  if (!Array.isArray(subSteps) || subSteps.length === 0) {
    return { startedAt: null, dueDate: null }
  }

  const toDate = toDateUtc
  const sorted = [...subSteps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const startDates = []
  const dueDates = []

  for (const s of sorted) {
    const startDate = toDate(s.startDate)
    const dueDate = toDate(s.dueDate)
    const durationDays = s.estimatedDurationDays ?? 1

    if (startDate && dueDate) {
      startDates.push(startDate)
      dueDates.push(dueDate)
    } else if (startDate) {
      startDates.push(startDate)
      const derivedDue = new Date(startDate.getTime() + durationDays * MS_PER_DAY)
      dueDates.push(derivedDue)
    } else if (dueDate) {
      startDates.push(new Date(dueDate.getTime() - durationDays * MS_PER_DAY))
      dueDates.push(dueDate)
    }
  }

  if (startDates.length === 0 || dueDates.length === 0) {
    return { startedAt: null, dueDate: null }
  }

  const startedAt = new Date(Math.min(...startDates.map((d) => d.getTime())))
  const dueDate = new Date(Math.max(...dueDates.map((d) => d.getTime())))

  return { startedAt, dueDate }
}

/**
 * Shift sub-step dates so the first sub-step starts at newStartDate.
 * Preserves relative durations between sub-steps.
 * @param {Array} subSteps - Sub-steps with startDate, dueDate, estimatedDurationDays, order
 * @param {Date} newStartDate - Target start date for the first sub-step
 * @returns {Array} Sub-steps with shifted dates (ISO strings)
 */
export function shiftSubStepsToStartAt(subSteps, newStartDate) {
  if (!Array.isArray(subSteps) || subSteps.length === 0 || !newStartDate) return subSteps
  const toDate = toDateUtc
  const toIso = (d) => (d && !Number.isNaN(d.getTime()) ? d.toISOString() : null)
  const sorted = [...subSteps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const first = sorted[0]
  let firstStart = toDate(first?.startDate)
  if (!firstStart && first?.dueDate) {
    const firstDue = toDate(first.dueDate)
    const dur = first?.estimatedDurationDays ?? 1
    firstStart = new Date(firstDue.getTime() - dur * MS_PER_DAY)
  }
  if (!firstStart || !(newStartDate instanceof Date) || Number.isNaN(newStartDate.getTime())) {
    return subSteps
  }
  const deltaMs = newStartDate.getTime() - firstStart.getTime()
  return sorted.map((s) => {
    const start = toDate(s.startDate)
    const due = toDate(s.dueDate)
    return {
      ...s,
      startDate: start ? toIso(new Date(start.getTime() + deltaMs)) : s.startDate,
      dueDate: due ? toIso(new Date(due.getTime() + deltaMs)) : s.dueDate,
    }
  })
}
