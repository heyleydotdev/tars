import { CircleCheckIcon, LoaderCircleIcon } from 'lucide-react'

import type { ChatPhaseProgress } from '@tars/core/schemas/chat'
import {
  Trace,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle
} from '@tars/ui/components/trace'

const PHASE_LABELS = {
  extract: { running: 'Extracting…', completed: 'Extracted' },
  repair: { running: 'Repairing…', completed: 'Repaired' },
  review: { running: 'Reviewing…', completed: 'Reviewed' }
} as const

export default function PhaseProgress({ phases }: { phases: Array<ChatPhaseProgress> }) {
  if (phases.length === 0) {
    return (
      <Trace role="status" aria-live="polite">
        <TraceLine status="running">
          <TraceIcon>
            <LoaderCircleIcon className="size-3.5 animate-spin" />
          </TraceIcon>
          <TraceTitle>Thinking…</TraceTitle>
        </TraceLine>
      </Trace>
    )
  }

  return (
    <Trace role="status" aria-live="polite">
      {phases.map((phase) => (
        <TraceLine key={phase.phase} status={phase.status === 'running' ? 'running' : undefined}>
          <TraceIcon>
            {phase.status === 'running' ? (
              <LoaderCircleIcon className="size-3.5 animate-spin" />
            ) : (
              <CircleCheckIcon className="size-3.5" />
            )}
          </TraceIcon>
          <TraceTitle>{PHASE_LABELS[phase.phase][phase.status]}</TraceTitle>
          {phase.status === 'completed' && phase.durationMs !== null ? (
            <TraceDescription>{(phase.durationMs / 1000).toFixed(1)}s</TraceDescription>
          ) : null}
        </TraceLine>
      ))}
    </Trace>
  )
}
