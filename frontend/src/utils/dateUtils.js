/**
 * Format a date-only value (e.g. project startDate, dueDate) for display.
 * Uses UTC to avoid off-by-one when the stored value is midnight UTC
 * and the user is in a timezone behind UTC.
 * @param {string|Date} d - ISO date string or Date
 * @param {string} fallback - Value when date is invalid or null
 * @returns {string}
 */
export const formatDateOnly = (d, fallback = '—') => {
  if (!d) return fallback
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return fallback
  return date.toLocaleDateString(undefined, { timeZone: 'UTC' })
}

/**
 * Compute due date from start date + duration in weeks.
 * @param {string|Date} startDate - Start date
 * @param {string|number} weeks - Duration in weeks (e.g. "3" or 3)
 * @returns {Date | null} Due date or null if invalid
 */
export const getDueDateFromStartAndWeeks = (startDate, weeks) => {
  if (!startDate) return null
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  if (Number.isNaN(start.getTime())) return null
  const numWeeks = Math.max(1, parseInt(weeks, 10) || 1)
  const due = new Date(start)
  due.setUTCDate(due.getUTCDate() + numWeeks * 7)
  return due
}

/**
 * Get project duration in days from startDate and dueDate when both exist.
 * @param {Object} project - Project with startDate, dueDate
 * @returns {{ totalDays: number } | null}
 */
export const getProjectDurationFromDates = (project) => {
  const start = project?.startDate
  const due = project?.dueDate
  if (!start || !due) return null

  const startDate = new Date(start)
  const dueDate = new Date(due)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(dueDate.getTime())) return null

  const startUtc = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  const dueUtc = Date.UTC(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
  const totalDays = Math.max(1, Math.ceil((dueUtc - startUtc) / (24 * 60 * 60 * 1000)))

  return { totalDays }
}
