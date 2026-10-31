import { CameraIcon, XIcon } from 'lucide-react'

import type { MeasureUnit } from '@tars/core/utils/format'
import { formatLength } from '@tars/core/utils/format'
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger
} from '@tars/ui/components/attachment'

import type { MeasureBatchItem } from '../lib/measure'
import EmptyState from './empty-state'

function describe(item: MeasureBatchItem, unit: MeasureUnit): string {
  if (item.status === 'error') return item.error ?? 'Measurement failed.'

  if (item.status === 'measuring') return 'Measuring…'

  if (item.status === 'done') {
    const object = item.result?.objects[0]

    return object
      ? `${formatLength(object.widthMm, unit)} × ${formatLength(object.heightMm, unit)}`
      : `${item.photo.width} × ${item.photo.height} px`
  }

  return `${item.photo.width} × ${item.photo.height} px`
}

export default function MeasurePhoto({
  items,
  selectedId,
  unit,
  pending,
  onSelect,
  onRemove
}: {
  items: Array<MeasureBatchItem>
  selectedId: string | null
  unit: MeasureUnit
  pending: boolean
  onSelect: (id: string) => void
  onRemove: (id: string) => void
}) {
  if (items.length === 0) {
    return (
      <EmptyState title="No Photos Yet" hint="Browse from the measure bar." icon={CameraIcon} />
    )
  }

  const selected = items.find((item) => item.id === selectedId) ?? items[0]

  return (
    <div className="flex flex-col gap-2 p-3">
      {items.map((item) => (
        <Attachment
          key={item.id}
          state={item.status === 'measuring' ? 'processing' : item.status}
          className={
            item.id === selected?.id
              ? 'bg-muted/30 w-full border-emerald-400/60 ring-1 ring-emerald-400/50'
              : 'w-full'
          }
        >
          <AttachmentMedia variant="image">
            <img src={item.photo.dataUrl} alt="" />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{item.photo.name}</AttachmentTitle>
            <AttachmentDescription>{describe(item, unit)}</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction
              aria-label={`Remove ${item.photo.name}`}
              disabled={pending}
              onClick={() => onRemove(item.id)}
            >
              <XIcon />
            </AttachmentAction>
          </AttachmentActions>
          <AttachmentTrigger
            aria-label={`Inspect ${item.photo.name}`}
            aria-pressed={item.id === selected?.id}
            onClick={() => onSelect(item.id)}
          />
        </Attachment>
      ))}
    </div>
  )
}
