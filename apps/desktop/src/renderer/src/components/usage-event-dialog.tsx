import type { UsageEventOutput } from '@tars/core/schemas/usage'
import { formatDateTime, formatUsdMicros } from '@tars/core/utils/format'
import { Badge } from '@tars/ui/components/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@tars/ui/components/dialog'
import { Table, TableBody, TableCell, TableRow } from '@tars/ui/components/table'

import { USAGE_FEATURE_TONES } from '../lib/badge-tones'

export default function UsageEventDialog({
  event,
  open,
  onOpenChange
}: {
  event: UsageEventOutput | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="capitalize">{event?.feature ?? 'Usage'}</DialogTitle>
          <DialogDescription>Usage details</DialogDescription>
        </DialogHeader>
        {event ? (
          <Table className="border-border border">
            <TableBody>
              <TableRow>
                <TableCell className="text-muted-foreground w-28">Feature</TableCell>
                <TableCell>
                  <Badge
                    variant="default"
                    className={`capitalize ${USAGE_FEATURE_TONES[event.feature] ?? 'bg-muted text-muted-foreground'}`}
                  >
                    {event.feature}
                  </Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">Model</TableCell>
                <TableCell className="font-mono">{event.model}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">Input tokens</TableCell>
                <TableCell className="font-mono tabular-nums">
                  {event.inputTokens.toLocaleString()}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">Output tokens</TableCell>
                <TableCell className="font-mono tabular-nums">
                  {event.outputTokens.toLocaleString()}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">Total tokens</TableCell>
                <TableCell className="font-mono tabular-nums">
                  {(event.inputTokens + event.outputTokens).toLocaleString()}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">Cost</TableCell>
                <TableCell className="font-mono tabular-nums">
                  {formatUsdMicros(event.costMicros)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">When</TableCell>
                <TableCell className="font-mono tabular-nums">
                  {formatDateTime(event.createdAt)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
