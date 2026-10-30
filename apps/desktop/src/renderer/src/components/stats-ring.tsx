import { cn } from '@tars/ui/lib/utils'

type StatsRingSegment = {
  key: string
  value: number
  offset?: number
  tone?: string
  color?: string
  title?: string
}

export default function StatsRing({
  segments,
  size,
  label,
  children
}: React.PropsWithChildren<{
  segments: Array<StatsRingSegment>
  size: string
  label: string
}>) {
  return (
    <div className={cn('relative shrink-0', size)}>
      <svg viewBox="0 0 42 42" className="size-full -rotate-90" role="img" aria-label={label}>
        <circle
          cx={21}
          cy={21}
          r={15.9155}
          fill="none"
          strokeWidth={4}
          pathLength={100}
          className="stroke-muted"
        />
        {segments.map((segment) => (
          <circle
            key={segment.key}
            cx={21}
            cy={21}
            r={15.9155}
            fill="none"
            strokeWidth={4}
            pathLength={100}
            strokeDasharray={`${segment.value} ${100 - segment.value}`}
            strokeDashoffset={-(segment.offset ?? 0)}
            className={segment.tone}
            style={segment.color ? { stroke: segment.color } : undefined}
          >
            {segment.title ? <title>{segment.title}</title> : null}
          </circle>
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}
