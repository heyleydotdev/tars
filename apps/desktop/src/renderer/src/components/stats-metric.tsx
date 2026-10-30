import { cn } from '@tars/ui/lib/utils'

export default function StatsMetric({
  label,
  value,
  tone
}: {
  label: string
  value: React.ReactNode
  tone?: string
}) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('tabular-nums', tone)}>{value}</dd>
    </div>
  )
}
