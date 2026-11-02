import { formatDateTime } from '@tars/core/utils/format'
import { Badge } from '@tars/ui/components/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@tars/ui/components/dialog'
import { Table, TableBody, TableCell, TableRow } from '@tars/ui/components/table'

import type { ActivityEvent } from '../lib/stats'
import { KIND_BADGE_TONES } from '../lib/badge-tones'
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
          <DialogDescription>Activity details</DialogDescription>
        </DialogHeader>
        {event ? (
          <Table className="border-border border">
            <TableBody>
              <TableRow>
                <TableCell className="text-muted-foreground w-28">Kind</TableCell>
                <TableCell>
                  <Badge variant="default" className={KIND_BADGE_TONES[event.kind]}>
                    {ACTIVITY_KIND_LABELS[event.kind]}
                  </Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">Occurred</TableCell>
                <TableCell className="font-mono tabular-nums">{formatDateTime(event.at)}</TableCell>
              </TableRow>
              {event.state ? (
                <TableRow>
                  <TableCell className="text-muted-foreground">State</TableCell>
                  <TableCell>{ACTIVITY_STATE_LABELS[event.state]}</TableCell>
                </TableRow>
              ) : null}
              {event.meta ? (
                <TableRow>
                  <TableCell className="text-muted-foreground">
                    {ACTIVITY_META_LABELS[event.kind]}
                  </TableCell>
                  <TableCell>{event.meta}</TableCell>
                </TableRow>
              ) : null}
              {event.content && event.content !== event.title ? (
                <TableRow>
                  <TableCell className="text-muted-foreground">Details</TableCell>
                  <TableCell className="wrap-break-word whitespace-pre-line select-text">
                    {event.content}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
