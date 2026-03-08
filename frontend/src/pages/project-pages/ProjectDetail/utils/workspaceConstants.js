/**
 * Workspace/cycle constants shared by CycleDetail, WeekTimeline, CalendarTab.
 */

export const KANBAN_COLUMNS = [
  { status: 'pending', label: 'Pending' },
  { status: 'in_progress', label: 'In progress' },
  { status: 'client_approval', label: 'Client approval' },
  { status: 'completed', label: 'Completed' },
]

export const TASK_STATUS_LABELS = {
  pending: 'Pending',
  client_approval: 'Client approval',
  in_progress: 'In progress',
  completed: 'Completed',
}

export const STATUS_LABELS = {
  pending: 'Pending',
  active: 'In progress / Client approval',
  in_progress: 'In progress',
  client_approval: 'Client approval',
  completed: 'Completed',
}

export const STATUS_ORDER = ['pending', 'in_progress', 'client_approval', 'completed']
