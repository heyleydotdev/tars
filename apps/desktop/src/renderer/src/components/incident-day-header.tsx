export default function IncidentDayHeader({
  label,
  count,
  unit
}: {
  label: string
  count: number
  unit: string
}) {
  return (
    <div className="bg-background/95 text-muted-foreground sticky top-0 z-10 flex h-7 items-center justify-between border-b px-3 font-mono text-xs/6 backdrop-blur">
      <span>{label}</span>
      <span className="tabular-nums">
        {count} {unit}
        {count === 1 ? '' : 's'}
      </span>
    </div>
  )
}
