import { cn } from '@tars/ui/lib/utils'

export default function StatsSwatch({
  tone,
  color,
  className
}: {
  tone?: string
  color?: string
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn('size-1.5 shrink-0', tone, className)}
      style={color ? { backgroundColor: color } : undefined}
    />
  )
}
