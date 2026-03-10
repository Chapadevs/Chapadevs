const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Parse a date value as local date (avoids UTC-midnight shift).
 * For strings: extracts YYYY-MM-DD and creates local midnight (so "2026-03-01T00:00:00.000Z"
 * is March 1 local, not Feb 28 in UTC-3).
 * For Date objects: normalizes to local calendar day.
 */
function toDateLocal(v) {
  if (!v) return null
  if (typeof v === 'string') {
    const match = v.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const y = Number(match[1])
      const m = Number(match[2]) - 1
      const d = Number(match[3])
      const date = new Date(y, m, d)
      return Number.isNaN(date.getTime()) ? null : date
    }
    return null
  }
  const d = v instanceof Date ? v : new Date(v)
  if (!d || Number.isNaN(d.getTime())) return null
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * Derive phase date range from sub-steps (min start, max due).
 * Timeline range always uses sub-step due dates, not completedAt, so the end date
 * reflects the biggest due date even when tasks are completed earlier.
 * @param {Array} subSteps - Sub-steps with startDate, dueDate, estimatedDurationDays, order
 * @returns {{ startDate: Date | null, dueDate: Date | null }}
 */
function derivePhaseRangeFromSubSteps(subSteps) {
  if (!Array.isArray(subSteps) || subSteps.length === 0) return { startDate: null, dueDate: null }
  const toDate = toDateLocal
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
  if (startDates.length === 0 || dueDates.length === 0) return { startDate: null, dueDate: null }
  return {
    startDate: new Date(Math.min(...startDates.map((d) => d.getTime()))),
    dueDate: new Date(Math.max(...dueDates.map((d) => d.getTime()))),
  }
}

/**
 * Get phase date range (start, end) from phase and project.
 * Priority: 1) sub-steps with dates, 2) phase.startedAt/dueDate, 3) project fallback.
 * @param {Object} phase - ProjectPhase
 * @param {Object} project - Project with startDate, dueDate
 * @param {Array} phases - All phases (for cumulative duration)
 * @returns {{ startDate: Date | null, dueDate: Date | null }}
 */
export function getPhaseDateRange(phase, project, phases = []) {
  const projectStart = project?.startDate ? toDateLocal(project.startDate) : null
  const order = phase?.order ?? 1
  const estimatedDurationDays = phase?.estimatedDurationDays ?? null

  // 1. First: derive from sub-steps when they have dates
  const fromSubSteps = derivePhaseRangeFromSubSteps(phase?.subSteps || [])
  if (fromSubSteps.startDate && fromSubSteps.dueDate) {
    // When phase was handed off (startedAt set by previous phase completion), use it as floor for start
    const phaseStartedAt = phase?.startedAt ? toDateLocal(phase.startedAt) : null
    if (phaseStartedAt && phaseStartedAt.getTime() > fromSubSteps.startDate.getTime()) {
      return {
        startDate: new Date(phaseStartedAt.getTime()),
        dueDate: fromSubSteps.dueDate,
      }
    }
    return fromSubSteps
  }

  // 2. Second: use phase explicit dates
  const phaseStartedAt = phase?.startedAt ? toDateLocal(phase.startedAt) : null
  const phaseDueDate = phase?.dueDate ? toDateLocal(phase.dueDate) : null
  if (phaseStartedAt && phaseDueDate) {
    return { startDate: phaseStartedAt, dueDate: phaseDueDate }
  }

  // 3. Last resort: project fallback (backward compatibility)
  if (projectStart && (estimatedDurationDays != null || phases.length > 0)) {
    const startDate = new Date(projectStart)
    const prevDuration = Array.isArray(phases)
      ? phases
          .filter((p) => (p.order ?? 0) < order)
          .reduce((sum, p) => sum + (p.estimatedDurationDays ?? 7), 0)
      : (order - 1) * 7
    startDate.setDate(startDate.getDate() + prevDuration)
    const duration = estimatedDurationDays ?? 7
    const dueDate = new Date(startDate)
    dueDate.setDate(dueDate.getDate() + duration)
    return { startDate, dueDate }
  }

  if (projectStart) {
    const startDate = new Date(projectStart)
    startDate.setDate(startDate.getDate() + (order - 1) * 7)
    const dueDate = new Date(startDate)
    dueDate.setDate(dueDate.getDate() + 6)
    return { startDate, dueDate }
  }

  return { startDate: null, dueDate: null }
}

/**
 * Get sub-step date range. Uses explicit dueDate/estimatedDurationDays when present,
 * otherwise derives from phase date range by segmenting.
 * @param {Object} subStep - Sub-step with dueDate, estimatedDurationDays, order
 * @param {Object} phase - Parent phase
 * @param {Object} project - Project
 * @param {Array} phases - All phases
 * @param {number} subStepIndex - Index in phase.subSteps
 * @param {number} totalSubSteps - Total sub-steps in phase
 * @returns {{ startDate: Date | null, dueDate: Date | null }}
 */
export function getSubStepDateRange(subStep, phase, project, phases, subStepIndex, totalSubSteps) {
  if (subStep?.startDate) {
    const startDate = toDateLocal(subStep.startDate)
    let dueDate = subStep?.dueDate
      ? toDateLocal(subStep.dueDate)
      : subStep?.estimatedDurationDays != null && subStep.estimatedDurationDays > 0
        ? new Date(startDate.getTime() + subStep.estimatedDurationDays * MS_PER_DAY)
        : startDate
    if (dueDate && startDate && dueDate.getTime() < startDate.getTime()) {
      dueDate = new Date(startDate.getTime())
    }
    return { startDate, dueDate }
  }

  if (subStep?.dueDate && subStep?.estimatedDurationDays != null && subStep.estimatedDurationDays > 0) {
    const dueDate = toDateLocal(subStep.dueDate)
    const startDate = new Date(dueDate.getTime() - subStep.estimatedDurationDays * MS_PER_DAY)
    return { startDate, dueDate }
  }

  if (subStep?.dueDate) {
    const dueDate = toDateLocal(subStep.dueDate)
    return { startDate: dueDate, dueDate }
  }

  const { startDate: phaseStart, dueDate: phaseDue } = getPhaseDateRange(phase, project, phases)
  if (!phaseStart || !phaseDue || totalSubSteps <= 0) {
    return { startDate: null, dueDate: null }
  }

  const phaseDurationMs = phaseDue.getTime() - phaseStart.getTime()
  const segmentMs = phaseDurationMs / totalSubSteps
  const startDate = new Date(phaseStart.getTime() + segmentMs * subStepIndex)
  const dueDate = new Date(phaseStart.getTime() + segmentMs * (subStepIndex + 1))
  return { startDate, dueDate }
}

/**
 * Normalize date to YYYY-MM-DD for day comparison (uses local date for consistency with toDateLocal).
 * @param {Date|string} d
 * @returns {string} YYYY-MM-DD
 */
export function toDateKey(d) {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Get all calendar items (phases and sub-steps with dates) for the project.
 * @param {Object} project - Project with phases
 * @returns {{
 *   phases: Array<{ phase, startDate, dueDate }>,
 *   subSteps: Array<{ phase, subStep, startDate, dueDate }>,
 *   daysWithItems: Set<string> - date keys (YYYY-MM-DD) that have at least one item
 *   itemCountByDate: Map<string, number> - date key -> count of sub-steps on that day
 * }}
 */
export function getCalendarItems(project) {
  const phases = [...(project?.phases || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const phaseItems = []
  const subStepItems = []
  const daysWithItems = new Set()
  const itemCountByDate = new Map()

  const addToDate = (key) => {
    daysWithItems.add(key)
    itemCountByDate.set(key, (itemCountByDate.get(key) || 0) + 1)
  }

  for (const phase of phases) {
    const { startDate: phaseStart, dueDate: phaseDue } = getPhaseDateRange(phase, project, phases)
    if (phaseStart && phaseDue) {
      phaseItems.push({ phase, startDate: phaseStart, dueDate: phaseDue })
      addToDate(toDateKey(phaseStart))
      addToDate(toDateKey(phaseDue))
    }

    const allSubSteps = [...(phase.subSteps || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    for (let i = 0; i < allSubSteps.length; i++) {
      const subStep = allSubSteps[i]
      const isPending = (subStep.status ?? (subStep.completed ? 'completed' : 'pending')) === 'pending'
      if (!isPending) continue

      const { startDate: ssStart, dueDate: ssDue } = getSubStepDateRange(
        subStep,
        phase,
        project,
        phases,
        i,
        allSubSteps.length
      )
      if (ssDue) {
        const dueKey = toDateKey(ssDue)
        subStepItems.push({ phase, subStep, startDate: ssStart || ssDue, dueDate: ssDue })
        addToDate(dueKey)
      }
    }
  }

  return { phases: phaseItems, subSteps: subStepItems, daysWithItems, itemCountByDate }
}

/**
 * Get sub-steps and phase milestones for a specific date.
 * @param {string} dateKey - YYYY-MM-DD
 * @param {Object} calendarItems - Result of getCalendarItems(project)
 * @returns {{ subSteps: Array, phaseMilestones: Array }}
 */
export function getItemsForDate(dateKey, calendarItems) {
  if (!dateKey || !calendarItems) return { subSteps: [], phaseMilestones: [] }

  const subSteps = calendarItems.subSteps.filter((item) => {
    const dueKey = toDateKey(item.dueDate)
    return dueKey === dateKey
  })

  const phaseMilestones = calendarItems.phases.filter((item) => {
    const startKey = toDateKey(item.startDate)
    const dueKey = toDateKey(item.dueDate)
    return startKey === dateKey || dueKey === dateKey
  })

  return { subSteps, phaseMilestones }
}
