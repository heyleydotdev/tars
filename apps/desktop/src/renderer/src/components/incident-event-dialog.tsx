import type { IncidentEventOutput, IncidentEvidenceOutput } from '@tars/core/schemas/incident'
import { formatDateTime, formatTime } from '@tars/core/utils/format'
import { isGuessedTime } from '@tars/core/utils/incident'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@tars/ui/components/dialog'

export default function IncidentEventDialog({
  event,
  evidence,
  open,
  onOpenChange,
  onSelectEvidence
}: {
  event: IncidentEventOutput | null
  evidence: Array<IncidentEvidenceOutput>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectEvidence: (id: string) => void
}) {
  const sources = event ? evidence.filter((item) => event.sourceEvidenceIds.includes(item.id)) : []
  const fromUser = sources.some((item) => item.kind === 'answer')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Timeline event</DialogTitle>
          <DialogDescription>
            {event?.occurredAt ? formatDateTime(event.occurredAt) : 'No time recorded'}
          </DialogDescription>
        </DialogHeader>

        {event ? (
          <div className="space-y-3">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs/6">
              <dt className="text-muted-foreground">Origin</dt>
              <dd>
                {fromUser
                  ? 'Your answer'
                  : isGuessedTime(event.timeSource)
                    ? 'Guessed time'
                    : (event.timeSource ?? 'unknown')}
              </dd>
              <dt className="text-muted-foreground">Confidence</dt>
              <dd>{event.confidence}</dd>
            </dl>

            <p className="text-xs/6">{event.description}</p>

            <div className="space-y-1">
              <p className="text-muted-foreground font-mono text-xs/6">sources</p>
              {sources.length === 0 ? (
                <p className="text-muted-foreground text-xs/6">No source evidence.</p>
              ) : (
                <ul className="divide-border border-border divide-y border">
                  {sources.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectEvidence(item.id)
                          onOpenChange(false)
                        }}
                        className="hover:bg-muted block w-full px-2 py-1.5 text-left"
                      >
                        <span className="text-muted-foreground font-mono text-xs/6 uppercase">
                          {item.kind} ·{' '}
                          {item.occurredAt
                            ? formatTime(item.occurredAt)
                            : item.kind === 'answer'
                              ? `received ${formatTime(item.createdAt)}`
                              : 'undated'}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-xs/6">
                          {item.summary ?? item.content ?? 'Screenshot'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
