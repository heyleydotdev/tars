import { formatDateTime } from '@tars/core/utils/format'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@tars/ui/components/dialog'

import type { ActivityEvent } from '../lib/stats'
import {
  ACTIVITY_KIND_LABELS,
  ACTIVITY_META_LABELS,
  ACTIVITY_STATE_LABELS
} from '../lib/stats-tones'

export default function StatsActivityDialog({
  event,
  open,
  onOpenChange
}: {
  event: ActivityEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{event?.title ?? 'Activity'}</DialogTitle>
          <DialogDescription>
            {event ? `${ACTIVITY_KIND_LABELS[event.kind]} · ${formatDateTime(event.at)}` : null}
          </DialogDescription>
        </DialogHeader>
        {event ? (
          <dl className="grid grid-cols-2 gap-3 text-sm/6">
            {event.state ? (
              <div>
                <dt className="text-muted-foreground text-xs/6">State</dt>
                <dd>{ACTIVITY_STATE_LABELS[event.state]}</dd>
              </div>
            ) : null}
            {event.meta ? (
              <div>
                <dt className="text-muted-foreground text-xs/6">
                  {ACTIVITY_META_LABELS[event.kind]}
                </dt>
                <dd>{event.meta}</dd>
              </div>
            ) : null}
            {event.content && event.content !== event.title ? (
              <div className="col-span-2">
                <dt className="text-muted-foreground text-xs/6">Details</dt>
                <dd className="wrap-break-word whitespace-pre-line select-text">{event.content}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
