import { cn } from '@tars/ui/lib/utils'

import { STAT_COLORS } from '../lib/stats-tones'

function readableText(hex: string): string {
  const value = hex.replace('#', '')
  const full =
    value.length === 3
      ? value
          .split('')
          .map((part) => part + part)
          .join('')
      : value
  const red = parseInt(full.slice(0, 2), 16)
  const green = parseInt(full.slice(2, 4), 16)
  const blue = parseInt(full.slice(4, 6), 16)
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255

  if (Number.isNaN(luminance)) return '#09090b'

  return luminance > 0.6 ? '#09090b' : '#fafafa'
}

export default function ConsoleStat({
  label,
  value,
  color = STAT_COLORS.muted,
  title,
  className
}: {
  label: string
  value: React.ReactNode
  color?: string
  title?: string
  className?: string
}) {
  return (
    <div className={cn('bg-muted flex items-stretch text-xs whitespace-nowrap', className)}>
      <dt className="text-muted-foreground flex items-center px-2 py-1 font-mono">{label}</dt>
      <dd
        className="flex min-w-0 items-center px-2 py-1 font-mono tabular-nums"
        style={{ backgroundColor: color, color: readableText(color) }}
        title={title}
      >
        <span className="min-w-0 truncate">{value}</span>
      </dd>
    </div>
  )
}
