import { useLayoutEffect, useRef, useState } from 'react'

import type { MeasureBoxOutput, MeasureResultOutput } from '@tars/core/schemas/measure'
import type { MeasureUnit } from '@tars/core/utils/format'
import { formatLength } from '@tars/core/utils/format'

import type { MeasureAnnotations } from '../stores/measure-annotations'
import { frameFontSize, frameLabelPadding, frameLineWidth } from '../lib/measure'
import { DEFAULT_OBJECT_FRAME } from '../stores/measure-annotations'

function MeasureBox({
  box,
  imageWidth,
  imageHeight,
  color,
  label,
  fontSize,
  lineWidth,
  padding
}: {
  box: MeasureBoxOutput
  imageWidth: number
  imageHeight: number
  color: string
  label: string
  fontSize: number
  lineWidth: number
  padding: number
}) {
  return (
    <div
      className="pointer-events-none absolute border"
      style={{
        left: `${(box.x1 / imageWidth) * 100}%`,
        top: `${(box.y1 / imageHeight) * 100}%`,
        width: `${(box.width / imageWidth) * 100}%`,
        height: `${(box.height / imageHeight) * 100}%`,
        borderColor: color,
        borderWidth: lineWidth
      }}
    >
      <span
        className="absolute top-0 left-0 font-mono leading-none whitespace-nowrap"
        style={{ backgroundColor: color, color: '#09090b', fontSize, padding }}
      >
        {label}
      </span>
    </div>
  )
}

export default function MeasureOverlay({
  image,
  result,
  annotations,
  unit
}: {
  image: string
  result: MeasureResultOutput
  annotations: MeasureAnnotations
  unit: MeasureUnit
}) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const frame = frameRef.current

    if (!frame) return

    function update(): void {
      if (!frame) return

      const width = frame.clientWidth
      const height = frame.clientHeight
      const scale = Math.min(width / result.image.width, height / result.image.height)

      setFit({
        width: result.image.width * scale,
        height: result.image.height * scale
      })
    }

    update()

    const observer = new ResizeObserver(update)
    observer.observe(frame)

    return () => observer.disconnect()
  }, [result.image.width, result.image.height])

  const fontSize = frameFontSize(annotations.fontSize, fit.width)
  const lineWidth = frameLineWidth(fit.width)
  const padding = frameLabelPadding(fontSize)

  return (
    <div ref={frameRef} className="flex h-full w-full items-center justify-center">
      <div className="relative" style={{ width: fit.width, height: fit.height }}>
        <img src={image} alt="Photo being measured" className="block size-full" />
        {annotations.reference.visible ? (
          <MeasureBox
            box={result.reference.box}
            imageWidth={result.image.width}
            imageHeight={result.image.height}
            color={annotations.reference.color}
            label="REF"
            fontSize={fontSize}
            lineWidth={lineWidth}
            padding={padding}
          />
        ) : null}
        {result.objects.map((object, index) => {
          const setting = annotations.objects[index] ?? DEFAULT_OBJECT_FRAME

          if (!setting.visible) return null

          return (
            <MeasureBox
              key={`${object.box.x1}-${object.box.y1}-${index}`}
              box={object.box}
              imageWidth={result.image.width}
              imageHeight={result.image.height}
              color={setting.color}
              label={`${index + 1} · ${formatLength(object.widthMm, unit)} × ${formatLength(object.heightMm, unit)}`}
              fontSize={fontSize}
              lineWidth={lineWidth}
              padding={padding}
            />
          )
        })}
      </div>
    </div>
  )
}
