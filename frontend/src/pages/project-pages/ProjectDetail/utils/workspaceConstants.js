/**
 * Workspace/cycle constants shared by CycleDetail, WeekTimeline, CalendarTab.
 */

export const KANBAN_COLUMNS = [
  { status: 'pending', label: 'Pending' },
  { status: 'in_progress', label: 'In progress' },
  { status: 'waiting_client', label: 'Waiting on client' },
  { status: 'completed', label: 'Completed' },
]

export const TASK_STATUS_LABELS = {
  pending: 'Pending',
  waiting_client: 'Waiting on client',
  in_progress: 'In progress',
  completed: 'Completed',
}

export const STATUS_LABELS = {
  pending: 'Pending',
  active: 'In progress / Waiting on client',
  in_progress: 'In progress',
  waiting_client: 'Waiting on client',
  completed: 'Completed',
}

export const STATUS_ORDER = ['pending', 'in_progress', 'waiting_client', 'completed']
