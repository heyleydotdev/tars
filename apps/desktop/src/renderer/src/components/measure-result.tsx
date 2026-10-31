import type { MeasureResultOutput } from '@tars/core/schemas/measure'
import type { MeasureUnit } from '@tars/core/utils/format'
import { formatLength } from '@tars/core/utils/format'
import { titleCase } from '@tars/core/utils/string'

export default function MeasureResult({
  result,
  unit
}: {
  result: MeasureResultOutput | null
  unit: MeasureUnit
}) {
  if (!result) return null

  return (
    <div className="space-y-3">
      <div className="border-border border p-3">
        <p className="text-muted-foreground text-xs">
          {result.objects[0] ? titleCase(result.objects[0].prompt) : null}
        </p>
        <p className="text-foreground font-mono text-2xl tabular-nums">
          {result.objects[0]
            ? `${formatLength(result.objects[0].widthMm, unit)} × ${formatLength(result.objects[0].heightMm, unit)}`
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
              <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono">
                {titleCase(object.prompt)}
              </span>
              <span className="text-foreground font-mono tabular-nums">
                {formatLength(object.widthMm, unit)} × {formatLength(object.heightMm, unit)}
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
