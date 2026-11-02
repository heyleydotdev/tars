import type {
  BlueprintRequirementOutput,
  BlueprintSummaryOutput
} from '@tars/core/schemas/blueprint'
import type {
  IncidentEventOutput,
  IncidentEvidenceOutput,
  IncidentSummaryOutput
} from '@tars/core/schemas/incident'
import type { UiFindingOutput, UiReviewSummaryOutput } from '@tars/core/schemas/ui-review'
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
  blueprint: 'capitalize bg-sky-400/15 text-sky-300',
  ui: 'capitalize bg-violet-400/15 text-violet-300',
  activity: 'capitalize bg-muted text-muted-foreground'
}

export const BLUEPRINT_STATUS_TONES: Record<BlueprintSummaryOutput['status'], string> = {
  intake: 'capitalize bg-amber-400/15 text-amber-300',
  mapped: 'capitalize bg-sky-400/15 text-sky-300',
  ready: 'capitalize bg-violet-400/15 text-violet-300',
  drafted: 'capitalize bg-emerald-400/15 text-emerald-300'
}

export const REQUIREMENT_STATUS_TONES: Record<BlueprintRequirementOutput['status'], string> = {
  clear: 'capitalize bg-emerald-400/15 text-emerald-300',
  ambiguous: 'capitalize bg-amber-400/15 text-amber-300',
  missing: 'capitalize bg-destructive/15 text-destructive',
  suggested: 'capitalize bg-sky-400/15 text-sky-300'
}

export const REQUIREMENT_CONFIDENCE_TONES: Record<
  BlueprintRequirementOutput['confidence'],
  string
> = {
  high: 'capitalize bg-emerald-400/15 text-emerald-300',
  medium: 'capitalize bg-amber-400/15 text-amber-300',
  low: 'capitalize bg-muted text-muted-foreground'
}

export const UI_REVIEW_STATUS_TONES: Record<UiReviewSummaryOutput['status'], string> = {
  created: 'capitalize bg-amber-400/15 text-amber-300',
  explained: 'capitalize bg-emerald-400/15 text-emerald-300'
}

export const SEVERITY_BADGE_TONES: Record<UiFindingOutput['severity'], string> = {
  significant: 'capitalize bg-destructive/15 text-destructive',
  moderate: 'capitalize bg-amber-400/15 text-amber-300',
  minor: 'capitalize bg-muted text-muted-foreground'
}

export const INCIDENT_STATUS_TONES: Record<IncidentSummaryOutput['status'], string> = {
  open: 'capitalize bg-amber-400/15 text-amber-300',
  closed: 'capitalize bg-emerald-400/15 text-emerald-300'
}

export const INCIDENT_CONFIDENCE_TONES: Record<IncidentEventOutput['confidence'], string> = {
  high: 'capitalize bg-emerald-400/15 text-emerald-300',
  medium: 'capitalize bg-amber-400/15 text-amber-300',
  low: 'capitalize bg-muted text-muted-foreground'
}

export const EVIDENCE_KIND_TONES: Record<IncidentEvidenceOutput['kind'], string> = {
  screenshot: 'capitalize bg-sky-400/15 text-sky-300',
  log: 'capitalize bg-violet-400/15 text-violet-300',
  text: 'capitalize bg-muted text-muted-foreground',
  voice: 'capitalize bg-amber-400/15 text-amber-300',
  answer: 'capitalize bg-emerald-400/15 text-emerald-300'
}
