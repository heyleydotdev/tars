import { formatCurrency } from '@tars/core/utils/format'

import type { SpendPoint } from '../lib/stats'
import EmptyState from './empty-state'

const WIDTH = 320
const HEIGHT = 96
const PADDING_X = 6
const PADDING_TOP = 8
const PADDING_BOTTOM = 10

export default function StatsSpendChart({
  points,
  totalCents,
  maxCents,
  currency
}: {
  points: Array<SpendPoint>
  totalCents: number
  maxCents: number
  currency: string
}) {
  if (maxCents === 0) {
    return (
      <EmptyState
        title="No Recent Spend"
        hint={`No expenses in the last ${points.length} months.`}
      />
    )
  }

  const innerWidth = WIDTH - PADDING_X * 2
  const innerHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM
  const step = points.length > 1 ? innerWidth / (points.length - 1) : innerWidth
  const coords = points.map((point, index) => ({
    ...point,
    x: PADDING_X + step * index,
    y: PADDING_TOP + innerHeight - (point.amountCents / maxCents) * innerHeight
  }))
  const line = coords
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`)
    .join(' ')
  const area = `${line} L${coords.at(-1)?.x ?? 0} ${HEIGHT - PADDING_BOTTOM} L${PADDING_X} ${HEIGHT - PADDING_BOTTOM} Z`

  return (
    <div className="p-3">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-emerald-400 tabular-nums">
          {formatCurrency(totalCents, currency)}
        </span>
        <span className="text-muted-foreground">last {points.length} months</span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Monthly spend, ${formatCurrency(totalCents, currency)} total`}
        className="mt-2 w-full"
      >
        {[0.25, 0.5, 0.75].map((fraction) => {
          const y = PADDING_TOP + innerHeight * (1 - fraction)

          return (
            <line
              key={fraction}
              x1={PADDING_X}
              x2={WIDTH - PADDING_X}
              y1={y}
              y2={y}
              className="stroke-border"
              strokeDasharray="2 3"
              vectorEffect="non-scaling-stroke"
            />
          )
        })}
        <path d={area} className="fill-emerald-400/15" />
        <path
          d={line}
          fill="none"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          className="stroke-emerald-400"
        />
        {coords.map((point) => (
          <circle key={point.key} cx={point.x} cy={point.y} r={2.2} className="fill-emerald-400">
            <title>{`${point.label}: ${formatCurrency(point.amountCents, currency)}`}</title>
          </circle>
        ))}
      </svg>

      <div className="text-muted-foreground relative mt-1 h-4 text-[10px]">
        {coords.map((point) => (
          <span
            key={point.key}
            className="absolute -translate-x-1/2 tabular-nums"
            style={{ left: `${(point.x / WIDTH) * 100}%` }}
          >
            {point.label}
          </span>
        ))}
      </div>
    </div>
  )
}
