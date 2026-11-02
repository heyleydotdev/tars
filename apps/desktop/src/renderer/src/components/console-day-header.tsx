import { capitalize } from '@tars/core/utils/string'

export default function ConsoleDayHeader({
  label,
  count,
  unit
}: {
  label: string
  count: number
  unit: string
}) {
  return (
    <div className="bg-background/95 text-muted-foreground sticky top-0 z-10 flex h-7 items-center justify-between border-b px-3 text-xs/6 backdrop-blur">
      <span className="font-mono tabular-nums">{label}</span>
      <span>
        <span className="font-mono tabular-nums">{count}</span> {capitalize(unit)}
        {count === 1 ? '' : 's'}
      </span>
    </div>
  )
}
