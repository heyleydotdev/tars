import type { ActivityState } from './stats'

export const ACTIVITY_STATE_TONES: Record<ActivityState, string> = {
  open: 'bg-sky-400',
  done: 'bg-emerald-400',
  pending: 'bg-amber-300',
  sent: 'bg-sky-400',
  dismissed: 'bg-muted-foreground/40'
}
