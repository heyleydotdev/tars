import type { JournalItemOutput } from '@tars/core/schemas/journal'
import { formatDateTime } from '@tars/core/utils/format'
import { activityKind } from '@tars/core/utils/journal'
import { Badge } from '@tars/ui/components/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@tars/ui/components/dialog'
import { Table, TableBody, TableCell, TableRow } from '@tars/ui/components/table'

import { KIND_BADGE_TONES } from '../lib/badge-tones'

export default function JournalActivityDialog({
  entry,
  open,
  onOpenChange
}: {
  entry: JournalItemOutput
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const type = activityKind(entry.tags)
  const measureCounts =
    type === 'measure' ? /^(\d+) photos? · (\d+) objects?$/.exec(entry.content) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{entry.title ?? 'Activity'}</DialogTitle>
          <DialogDescription>Activity details</DialogDescription>
        </DialogHeader>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="text-muted-foreground w-24">Kind</TableCell>
              <TableCell>
                <Badge variant="default" className={KIND_BADGE_TONES[type]}>
                  {type}
                </Badge>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-muted-foreground">Occurred</TableCell>
              <TableCell className="font-mono tabular-nums">
                {formatDateTime(entry.occurredAt)}
              </TableCell>
            </TableRow>
            {entry.tags.length > 0 ? (
              <TableRow>
                <TableCell className="text-muted-foreground">Tags</TableCell>
                <TableCell>{entry.tags.join(', ')}</TableCell>
              </TableRow>
            ) : null}
            {measureCounts ? (
              <>
                <TableRow>
                  <TableCell className="text-muted-foreground">Photos</TableCell>
                  <TableCell className="font-mono tabular-nums">{measureCounts[1]}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-muted-foreground">Objects</TableCell>
                  <TableCell className="font-mono tabular-nums">{measureCounts[2]}</TableCell>
                </TableRow>
              </>
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground">Content</TableCell>
                <TableCell className="wrap-break-word whitespace-pre-line select-text">
                  {entry.content}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  )
}
