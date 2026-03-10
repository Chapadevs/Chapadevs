/**
 * Get project duration in days from startDate and dueDate when both exist.
 * Uses UTC date parts to avoid timezone shifts.
 * @param {Object} project - Project with startDate, dueDate, timeline
 * @returns {{ totalDays: number } | null} - totalDays when derivable from dates
 */
export function getProjectDurationFromDates(project) {
  const start = project?.startDate;
  const due = project?.dueDate;
  if (!start || !due) return null;

  const startDate = new Date(start);
  const dueDate = new Date(due);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(dueDate.getTime()))
    return null;

  const startUtc = Date.UTC(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
  );
  const dueUtc = Date.UTC(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate(),
  );
  const totalDays = Math.max(
    1,
    Math.ceil((dueUtc - startUtc) / (24 * 60 * 60 * 1000)),
  );

  return { totalDays };
}
