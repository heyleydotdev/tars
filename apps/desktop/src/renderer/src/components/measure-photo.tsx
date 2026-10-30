import { CameraIcon } from 'lucide-react'

import { Button } from '@tars/ui/components/button'
import { Spinner } from '@tars/ui/components/spinner'
import { cn } from '@tars/ui/lib/utils'

import type { MeasureBatchItem } from '../lib/measure'
import EmptyState from './empty-state'
import MeasureOverlay from './measure-overlay'

export default function MeasurePhoto({
  items,
  selectedId,
  pending,
  onSelect,
  onRemove
}: {
  items: Array<MeasureBatchItem>
  selectedId: string | null
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
    <div className="space-y-3 p-3">
      <div className="flex scrollbar-none gap-2 overflow-x-auto pb-1">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={item.id === selected?.id}
            aria-label={item.photo.name}
            onClick={() => onSelect(item.id)}
            className={cn(
              'relative h-14 w-20 shrink-0 overflow-hidden border transition-opacity',
              item.id === selected?.id ? 'border-emerald-400' : 'border-border opacity-70',
              item.status === 'error' && 'border-destructive'
            )}
          >
            <img src={item.photo.dataUrl} alt="" className="size-full object-cover" />
            {item.status === 'measuring' ? (
              <span className="bg-background/60 absolute inset-0 flex items-center justify-center">
                <Spinner className="size-3" />
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground min-w-0 truncate" title={selected?.photo.name}>
          {selected?.photo.name}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground font-mono tabular-nums">
            {selected?.photo.width}×{selected?.photo.height}px
          </span>
          <Button
            variant="ghost"
            size="xs"
            disabled={pending || !selected}
            onClick={() => {
              if (selected) onRemove(selected.id)
            }}
          >
            Remove
          </Button>
        </div>
      </div>

      {selected ? (
        <>
          <div className="border-border relative border">
            {selected.result ? (
              <MeasureOverlay image={selected.photo.dataUrl} result={selected.result} />
            ) : (
              <img
                src={selected.photo.dataUrl}
                alt={selected.photo.name}
                className="block w-full"
              />
            )}
            {selected.status === 'measuring' ? (
              <div className="bg-background/60 absolute inset-0 flex items-center justify-center">
                <Spinner className="text-amber-300" />
              </div>
            ) : null}
          </div>
          {selected.error ? <p className="text-destructive text-xs">{selected.error}</p> : null}
        </>
      ) : null}
    </div>
  )
}
