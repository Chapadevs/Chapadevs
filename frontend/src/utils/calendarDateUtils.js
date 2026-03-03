const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Get phase date range (start, end) from phase and project.
 * Reuses logic from WeekTimeline.
 * @param {Object} phase - ProjectPhase
 * @param {Object} project - Project with startDate, dueDate
 * @param {Array} phases - All phases (for cumulative duration)
 * @returns {{ startDate: Date | null, dueDate: Date | null }}
 */
export function getPhaseDateRange(phase, project, phases = []) {
  const projectStart = project?.startDate ? new Date(project.startDate) : null
  const order = phase?.order ?? 1
  const phaseStartedAt = phase?.startedAt ? new Date(phase.startedAt) : null
  const phaseDueDate = phase?.dueDate ? new Date(phase.dueDate) : null
  const estimatedDurationDays = phase?.estimatedDurationDays ?? null

  if (phaseStartedAt && phaseDueDate) {
    return { startDate: phaseStartedAt, dueDate: phaseDueDate }
  }

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
  if (subStep?.dueDate && subStep?.estimatedDurationDays != null && subStep.estimatedDurationDays > 0) {
    const dueDate = new Date(subStep.dueDate)
    const startDate = new Date(dueDate.getTime() - subStep.estimatedDurationDays * MS_PER_DAY)
    return { startDate, dueDate }
  }

  if (subStep?.dueDate) {
    const dueDate = new Date(subStep.dueDate)
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
 * Normalize date to midnight UTC for day comparison.
 * @param {Date|string} d
 * @returns {string} YYYY-MM-DD
 */
export function toDateKey(d) {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
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
