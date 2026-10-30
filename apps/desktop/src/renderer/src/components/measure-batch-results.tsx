import type { MeasureBatchItem } from '../lib/measure'
import { formatMm } from '../lib/measure'
import EmptyState from './empty-state'
import MeasureResult from './measure-result'

export default function MeasureBatchResults({
  items,
  selectedId,
  onSelect
}: {
  items: Array<MeasureBatchItem>
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  if (items.length === 0) {
    return <EmptyState title="No Measurements" hint="Browse photos and name an object." />
  }

  const selected = items.find((item) => item.id === selectedId) ?? items[0]
  const measured = items.filter((item) => item.status === 'done').length
  const failed = items.filter((item) => item.status === 'error').length

  return (
    <div className="space-y-3 p-3">
      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
        <div>
          <dt className="text-muted-foreground">Photos</dt>
          <dd className="text-foreground font-mono tabular-nums">{items.length}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Measured</dt>
          <dd className="font-mono text-emerald-400 tabular-nums">{measured}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Failed</dt>
          <dd className="text-destructive font-mono tabular-nums">{failed}</dd>
        </div>
      </dl>

      <ul className="divide-border border-border divide-y border">
        {items.map((item, index) => {
          const object = item.result?.objects[0]
          const value =
            item.status === 'done' && object
              ? `${formatMm(object.widthMm)} × ${formatMm(object.heightMm)}`
              : (item.error ?? item.status)

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className={
                  item.id === selected?.id
                    ? 'bg-muted/20 flex w-full items-center gap-2 px-3 py-2 text-left text-xs'
                    : 'hover:bg-muted/20 flex w-full items-center gap-2 px-3 py-2 text-left text-xs'
                }
              >
                <span className="text-muted-foreground font-mono">
                  #{String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-foreground min-w-0 flex-1 truncate">{item.photo.name}</span>
                <span
                  className={
                    item.status === 'error'
                      ? 'text-destructive font-mono text-[10px]'
                      : item.status === 'done'
                        ? 'text-foreground font-mono tabular-nums'
                        : 'text-muted-foreground font-mono text-[10px] uppercase'
                  }
                >
                  {value}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {selected?.result ? (
        <MeasureResult result={selected.result} />
      ) : selected?.status === 'idle' ? (
        <EmptyState title="Ready to Measure" hint="Run the batch from the measure bar." />
      ) : null}
    </div>
  )
}
