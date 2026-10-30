import type { MeasureResultOutput } from '@tars/core/schemas/measure'
import { titleCase } from '@tars/core/utils/string'

import { formatMm } from '../lib/measure'

export default function MeasureResult({ result }: { result: MeasureResultOutput | null }) {
  if (!result) return null

  return (
    <div className="space-y-3">
      <div className="border-border border p-3">
        <p className="text-muted-foreground text-xs">
          {result.objects[0] ? titleCase(result.objects[0].prompt) : null}
        </p>
        <p className="text-foreground font-mono text-2xl tabular-nums">
          {result.objects[0]
            ? `${formatMm(result.objects[0].widthMm)} × ${formatMm(result.objects[0].heightMm)}`
            : '—'}
        </p>
        <p className="text-muted-foreground mt-1 font-mono text-xs">
          {result.objects.length} {result.objects.length === 1 ? 'match' : 'matches'}
        </p>
      </div>

      {result.objects.length > 1 ? (
        <ul className="divide-border border-border divide-y border">
          {result.objects.map((object, index) => (
            <li
              key={`${object.box.x1}-${object.box.y1}-${index}`}
              className="flex items-baseline justify-between gap-3 px-3 py-2 text-xs"
            >
              <span className="text-muted-foreground font-mono">#{index + 1}</span>
              <span className="text-foreground font-mono tabular-nums">
                {formatMm(object.widthMm)} × {formatMm(object.heightMm)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Reference</dt>
          <dd className="text-foreground font-mono">{titleCase(result.reference.label)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Matches</dt>
          <dd className="text-foreground font-mono tabular-nums">{result.reference.matches}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Scale</dt>
          <dd className="font-mono text-sky-400 tabular-nums">
            {result.scaleMmPerPx.toFixed(3)} mm/px
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Ref Box</dt>
          <dd className="text-foreground font-mono tabular-nums">
            {Math.round(result.reference.box.width)}×{Math.round(result.reference.box.height)}px
          </dd>
        </div>
      </dl>
    </div>
  )
}
