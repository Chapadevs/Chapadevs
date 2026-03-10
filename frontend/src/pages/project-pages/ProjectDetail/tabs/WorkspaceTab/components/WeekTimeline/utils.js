const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Returns ms at noon (center) of the given date's day for consistent day positioning. */
export function getCenterOfDayMs(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime() + MS_PER_DAY / 2
}
