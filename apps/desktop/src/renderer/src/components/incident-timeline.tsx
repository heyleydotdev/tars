import { useMemo, useState } from 'react'
import { InfoIcon, PencilIcon } from 'lucide-react'

import type { IncidentDetailOutput, IncidentEventOutput } from '@tars/core/schemas/incident'
import { ERRORS } from '@tars/core/errors'
import { formatTime, fromDateTimeLocal, toDateKey, toDateTimeLocal } from '@tars/core/utils/format'
import { isGuessedTime } from '@tars/core/utils/incident'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '@tars/ui/components/context-menu'
import { Input } from '@tars/ui/components/input'
import { cn } from '@tars/ui/lib/utils'

import { useUpdateIncidentEvent } from '../lib/incident'
import IncidentDayHeader from './incident-day-header'
import IncidentEventDialog from './incident-event-dialog'

function confidenceClass(confidence: IncidentEventOutput['confidence']): string {
  if (confidence === 'high') return 'text-emerald-400'
  if (confidence === 'medium') return 'text-amber-300'

  return 'text-muted-foreground'
}

function groupEventsByDay(
  events: Array<IncidentEventOutput>
): Array<{ key: string; label: string; events: Array<IncidentEventOutput> }> {
  const groups: Array<{ key: string; label: string; events: Array<IncidentEventOutput> }> = []

  for (const event of events) {
    const key = event.occurredAt ? toDateKey(event.occurredAt) : 'no-time'
    const last = groups[groups.length - 1]

    if (last?.key === key) {
      last.events.push(event)
      continue
    }

    groups.push({
      key,
      label: event.occurredAt ? toDateKey(event.occurredAt) : 'no time',
      events: [event]
    })
  }

  return groups
}

export default function IncidentTimeline({
  detail,
  highlightedEventIds,
  onSelectEvidence
}: {
  detail: IncidentDetailOutput
  highlightedEventIds: Set<string>
  onSelectEvidence: (id: string) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [details, setDetails] = useState<IncidentEventOutput | null>(null)
  const update = useUpdateIncidentEvent()
  const evidenceById = useMemo(
    () => new Map(detail.evidence.map((item) => [item.id, item])),
    [detail.evidence]
  )
  const groups = useMemo(() => groupEventsByDay(detail.events), [detail.events])

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
    <div className="border-border border-t">
      {groups.map((group) => (
        <section key={group.key}>
          <IncidentDayHeader label={group.label} count={group.events.length} unit="event" />
          <ol className="divide-border divide-y">
            {group.events.map((event) => {
              const highlighted = highlightedEventIds.has(event.id)
              const fromUser = event.sourceEvidenceIds.some(
                (id) => evidenceById.get(id)?.kind === 'answer'
              )
              const sourceKinds = [
                ...new Set(
                  event.sourceEvidenceIds.flatMap((id) => {
                    const item = evidenceById.get(id)

                    return item ? [item.kind] : []
                  })
                )
              ].join(' · ')

              return (
                <li
                  key={event.id}
                  className={cn(
                    'p-2 transition-colors',
                    highlighted ? 'bg-emerald-400/10' : 'hover:bg-muted'
                  )}
                  data-event-id={event.id}
                >
                  <ContextMenu>
                    <ContextMenuTrigger render={<div className="flex items-start gap-2" />}>
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
                        <span className="text-muted-foreground block font-mono text-xs/6 uppercase">
                          {fromUser
                            ? 'user'
                            : isGuessedTime(event.timeSource)
                              ? 'guessed'
                              : (event.timeSource ?? 'unknown')}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-xs/6">{event.description}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-muted-foreground font-mono text-xs/6 uppercase">
                            {sourceKinds}
                          </span>
                          <span className="text-muted-foreground font-mono text-xs/6 uppercase">
                            · {event.sourceEvidenceIds.length} source
                            {event.sourceEvidenceIds.length === 1 ? '' : 's'}
                          </span>
                          <span
                            className={cn(
                              'ml-auto font-mono text-xs/6 uppercase',
                              confidenceClass(event.confidence)
                            )}
                          >
                            {event.confidence}
                          </span>
                        </div>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => setDetails(event)}>
                        <InfoIcon />
                        Details
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => startEditing(event)}>
                        <PencilIcon />
                        Fix time
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
      {update.isError ? (
        <p className="text-destructive p-2 text-xs/6">{ERRORS.incidentTimeUpdateFailed}</p>
      ) : null}

      <IncidentEventDialog
        event={details}
        evidence={detail.evidence}
        open={details !== null}
        onOpenChange={(open) => {
          if (!open) setDetails(null)
        }}
        onSelectEvidence={onSelectEvidence}
      />
    </div>
  )
}
