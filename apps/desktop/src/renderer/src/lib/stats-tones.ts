import type { ActivityKind, ActivityState } from './stats'

export const ACTIVITY_KIND_LABELS: Record<ActivityKind, string> = {
  note: 'NOTE',
  expense: 'EXP',
  task: 'TASK',
  reminder: 'REM'
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
