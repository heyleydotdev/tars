import type { MeasureBoxOutput, MeasureResultOutput } from '@tars/core/schemas/measure'
import { cn } from '@tars/ui/lib/utils'

import { formatMm } from '../lib/measure'

function MeasureBox({
  box,
  imageWidth,
  imageHeight,
  tone,
  labelTone,
  label
}: {
  box: MeasureBoxOutput
  imageWidth: number
  imageHeight: number
  tone: string
  labelTone: string
  label: string
}) {
  return (
    <div
      className={cn('pointer-events-none absolute border-2', tone)}
      style={{
        left: `${(box.x1 / imageWidth) * 100}%`,
        top: `${(box.y1 / imageHeight) * 100}%`,
        width: `${(box.width / imageWidth) * 100}%`,
        height: `${(box.height / imageHeight) * 100}%`
      }}
    >
      <span
        className={cn(
          'absolute top-0 left-0 px-1 py-0.5 font-mono text-[10px] leading-none whitespace-nowrap',
          labelTone
        )}
      >
        {label}
      </span>
    </div>
  )
}

export default function MeasureOverlay({
  image,
  result
}: {
  image: string
  result: MeasureResultOutput
}) {
  return (
    <div className="relative">
      <img src={image} alt="Photo being measured" className="block w-full" />
      <MeasureBox
        box={result.reference.box}
        imageWidth={result.image.width}
        imageHeight={result.image.height}
        tone="border-amber-300"
        labelTone="bg-amber-300 text-background"
        label="REF"
      />
      {result.objects.map((object, index) => (
        <MeasureBox
          key={`${object.box.x1}-${object.box.y1}-${index}`}
          box={object.box}
          imageWidth={result.image.width}
          imageHeight={result.image.height}
          tone="border-emerald-400"
          labelTone="bg-emerald-400 text-background"
          label={`${index + 1} · ${formatMm(object.widthMm)} × ${formatMm(object.heightMm)}`}
        />
      ))}
    </div>
  )
}
