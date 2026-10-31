import { useState } from 'react'

import type { IncidentEventOutput } from '@tars/core/schemas/incident'
import { fromDateTimeLocal, toDateTimeLocal } from '@tars/core/utils/format'
import { Button } from '@tars/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@tars/ui/components/dialog'
import { Input } from '@tars/ui/components/input'
import { Spinner } from '@tars/ui/components/spinner'

export default function IncidentTimeDialog({
  event,
  open,
  pending,
  onOpenChange,
  onSave
}: {
  event: IncidentEventOutput | null
  open: boolean
  pending: boolean
  onOpenChange: (open: boolean) => void
  onSave: (occurredAt: string | null) => void
}) {
  const [draft, setDraft] = useState<{ id: string; value: string } | null>(null)
  const value =
    draft && draft.id === event?.id ? draft.value : event ? toDateTimeLocal(event.occurredAt) : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fix event time</DialogTitle>
          <DialogDescription>
            {event ? event.description.slice(0, 140) : 'Set when this event happened.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Input
            type="datetime-local"
            value={value}
            disabled={pending}
            aria-label="Event time"
            onChange={(changeEvent) =>
              setDraft({ id: event?.id ?? '', value: changeEvent.target.value })
            }
          />
          <p className="text-muted-foreground text-xs/6">
            Leave empty to keep the time unknown. Saving marks it as your correction.
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={() => onSave(fromDateTimeLocal(value))}>
            {pending ? <Spinner className="size-3.5" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
