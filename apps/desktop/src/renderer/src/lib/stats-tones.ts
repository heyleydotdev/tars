import type { ActivityKind, ActivityState } from './stats'

export const STAT_COLORS = {
  sky: '#38bdf8',
  emerald: '#34d399',
  amber: '#fcd34d',
  muted: '#a1a1aa'
}

export const ACTIVITY_KIND_LABELS: Record<ActivityKind, string> = {
  note: 'note',
  expense: 'exp',
  task: 'task',
  reminder: 'rem'
}

export const ACTIVITY_STATE_LABELS: Record<ActivityState, string> = {
  open: 'Open',
  done: 'Done',
  pending: 'Pending',
  sent: 'Sent',
  dismissed: 'Dismissed'
}

export const ACTIVITY_META_LABELS: Record<ActivityKind, string> = {
  note: 'Mood',
  expense: 'Amount',
  task: 'Details',
  reminder: 'Details'
}

export const ACTIVITY_STATE_TONES: Record<ActivityState, string> = {
  open: 'bg-sky-400',
  done: 'bg-emerald-400',
  pending: 'bg-amber-300',
  sent: 'bg-sky-400',
  dismissed: 'bg-muted-foreground/40'
}
