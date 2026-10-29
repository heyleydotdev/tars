import { cn } from '@tars/ui/lib/utils'

export default function ConsoleStat({
  label,
  value,
  tone,
  title,
  className
}: {
  label: string
  value: React.ReactNode
  tone?: string
  title?: string
  className?: string
}) {
  return (
    <div className="flex items-baseline gap-1.5 text-xs whitespace-nowrap">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('text-foreground tabular-nums', tone, className)} title={title}>
        {value}
      </dd>
    </div>
  )
}
