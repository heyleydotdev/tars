import type { JournalItemOutput } from '@tars/core/schemas/journal'
import { formatDateTime } from '@tars/core/utils/format'
import { activityKind } from '@tars/core/utils/journal'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@tars/ui/components/dialog'

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{entry.title ?? 'Activity'}</DialogTitle>
          <DialogDescription>
            <span className="font-mono uppercase">{type}</span> ·{' '}
            <span className="font-mono tabular-nums">{formatDateTime(entry.occurredAt)}</span>
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm/6 wrap-break-word whitespace-pre-line select-text">{entry.content}</p>
      </DialogContent>
    </Dialog>
  )
}
