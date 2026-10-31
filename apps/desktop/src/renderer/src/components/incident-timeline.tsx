import { useState } from 'react'

import type { IncidentDetailOutput, IncidentEventOutput } from '@tars/core/schemas/incident'
import { ERRORS } from '@tars/core/errors'
import { formatTime, fromDateTimeLocal, toDateKey, toDateTimeLocal } from '@tars/core/utils/format'
import { isGuessedTime } from '@tars/core/utils/incident'
import { Input } from '@tars/ui/components/input'

import { useUpdateIncidentEvent } from '../lib/incident'

function confidenceClass(confidence: IncidentEventOutput['confidence']): string {
  if (confidence === 'high') return 'text-emerald-400'
  if (confidence === 'medium') return 'text-amber-300'

  return 'text-muted-foreground'
}

export default function IncidentTimeline({
  detail,
  selectedEvidenceId,
  highlightedEventIds,
  onSelectEvidence
}: {
  detail: IncidentDetailOutput
  selectedEvidenceId: string | null
  highlightedEventIds: Set<string>
  onSelectEvidence: (id: string) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const update = useUpdateIncidentEvent()
  const evidenceById = new Map(detail.evidence.map((item) => [item.id, item]))

  function startEditing(event: IncidentEventOutput): void {
    setEditingId(event.id)
    setDraft(toDateTimeLocal(event.occurredAt))
  }

  function commit(event: IncidentEventOutput): void {
    setEditingId(null)
    update.mutate({ eventId: event.id, occurredAt: fromDateTimeLocal(draft) })
  }

  if (detail.events.length === 0) {
    return (
      <p className="text-muted-foreground p-3 text-xs/6">
        The timeline builds as evidence arrives. Add a screenshot or log to start.
      </p>
    )
  }

  return (
    <ol className="divide-border border-border divide-y border">
      {detail.events.map((event, index) => {
        const previous = detail.events[index - 1]
        const newDay =
          !previous ||
          toDateKey(event.occurredAt ?? '') !== toDateKey(previous.occurredAt ?? '') ||
          (!event.occurredAt && !previous.occurredAt)
        const highlighted = highlightedEventIds.has(event.id)

        return (
          <li
            key={event.id}
            className={highlighted ? 'bg-emerald-400/10 p-2' : 'p-2'}
            data-event-id={event.id}
          >
            {newDay && event.occurredAt ? (
              <p className="text-muted-foreground mb-1 font-mono text-xs/6">
                {toDateKey(event.occurredAt)}
              </p>
            ) : null}
            <div className="flex items-start gap-2">
              <div className="w-20 shrink-0">
                {editingId === event.id ? (
                  <Input
                    autoFocus
                    type="datetime-local"
                    value={draft}
                    className="h-6 px-1 text-xs/6"
                    onChange={(changeEvent) => setDraft(changeEvent.target.value)}
                    onBlur={() => commit(event)}
                    onKeyDown={(keyEvent) => {
                      if (keyEvent.key === 'Enter') commit(event)
                      if (keyEvent.key === 'Escape') setEditingId(null)
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    title="Fix this time"
                    onClick={() => startEditing(event)}
                    className="text-left font-mono text-xs/6 hover:underline"
                  >
                    {event.occurredAt ? formatTime(event.occurredAt) : 'no time'}
                  </button>
                )}
                <span className="text-muted-foreground block font-mono text-xs/6">
                  {event.sourceEvidenceIds.some((id) => evidenceById.get(id)?.kind === 'answer')
                    ? 'user'
                    : isGuessedTime(event.timeSource)
                      ? 'guessed'
                      : (event.timeSource ?? 'unknown')}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs/6">{event.description}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {event.sourceEvidenceIds.map((id) => {
                    const evidence = evidenceById.get(id)

                    if (!evidence) return null

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onSelectEvidence(id)}
                        className={
                          id === selectedEvidenceId
                            ? 'border border-emerald-400/60 bg-emerald-400/10 px-1.5 py-0.5 font-mono text-xs/6'
                            : 'border-border hover:bg-muted/30 border px-1.5 py-0.5 font-mono text-xs/6'
                        }
                      >
                        {evidence.kind} ·{' '}
                        {evidence.occurredAt ? formatTime(evidence.occurredAt) : 'no time'}
                      </button>
                    )
                  })}
                  <span
                    className={`ml-auto font-mono text-xs/6 ${confidenceClass(event.confidence)}`}
                  >
                    {event.confidence}
                  </span>
                </div>
              </div>
            </div>
          </li>
        )
      })}
      {update.isError ? (
        <li className="text-destructive p-2 text-xs/6">{ERRORS.incidentTimeUpdateFailed}</li>
      ) : null}
    </ol>
  )
}
