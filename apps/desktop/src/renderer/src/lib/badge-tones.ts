import type { ActivityKind as JournalActivityKind } from '@tars/core/utils/journal'

import type { ActivityKind as StatsActivityKind } from './stats'

type BadgeKind = JournalActivityKind | StatsActivityKind | 'rem'

export const KIND_BADGE_TONES: Record<BadgeKind, string> = {
  note: 'capitalize bg-sky-400/15 text-sky-300',
  expense: 'capitalize bg-emerald-400/15 text-emerald-300',
  task: 'capitalize bg-violet-400/15 text-violet-300',
  reminder: 'capitalize bg-amber-400/15 text-amber-300',
  rem: 'capitalize bg-amber-400/15 text-amber-300',
  incident: 'capitalize bg-destructive/15 text-destructive',
  measure: 'capitalize bg-emerald-400/15 text-emerald-300',
  activity: 'capitalize bg-muted text-muted-foreground'
}
