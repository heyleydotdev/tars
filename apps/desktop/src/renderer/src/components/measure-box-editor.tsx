import { useRef, useState } from 'react'

import type { MeasureBoxOutput, MeasureResultOutput } from '@tars/core/schemas/measure'
import { ERRORS } from '@tars/core/errors'
import { recalculateMeasureResult } from '@tars/core/utils/measure'
import { Button } from '@tars/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@tars/ui/components/dialog'

import type { MeasureBatchItem } from '../lib/measure'
import { frameLineWidth } from '../lib/measure'
import { useMeasureAnnotations } from '../stores/measure-annotations'

type BoxKey = { type: 'reference' } | { type: 'object'; index: number }
type Handle = 'move' | 'nw' | 'ne' | 'sw' | 'se'

type DragState = {
  key: BoxKey
  handle: Handle
  startX: number
  startY: number
  box: MeasureBoxOutput
}

const HANDLES: Array<Handle> = ['nw', 'ne', 'sw', 'se']

function boxKey(key: BoxKey): string {
  return key.type === 'reference' ? 'reference' : `object-${key.index}`
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function resizeBox(
  box: MeasureBoxOutput,
  handle: Handle,
  dx: number,
  dy: number,
  width: number,
  height: number,
  minSize: number
): MeasureBoxOutput {
  let x1 = box.x1
  let y1 = box.y1
  let x2 = box.x2
  let y2 = box.y2

  if (handle.includes('w')) x1 = clamp(box.x1 + dx, 0, width - minSize)
  if (handle.includes('e')) x2 = clamp(box.x2 + dx, minSize, width)
  if (handle.includes('n')) y1 = clamp(box.y1 + dy, 0, height - minSize)
  if (handle.includes('s')) y2 = clamp(box.y2 + dy, minSize, height)

  if (x2 - x1 < minSize) {
    if (handle.includes('w')) x1 = x2 - minSize
    else x2 = x1 + minSize
  }

  if (y2 - y1 < minSize) {
    if (handle.includes('n')) y1 = y2 - minSize
    else y2 = y1 + minSize
  }

  return {
    x1,
    y1,
    x2,
    y2,
    width: x2 - x1,
    height: y2 - y1
  }
}

function moveBox(
  box: MeasureBoxOutput,
  dx: number,
  dy: number,
  width: number,
  height: number
): MeasureBoxOutput {
  const x1 = clamp(box.x1 + dx, 0, width - box.width)
  const y1 = clamp(box.y1 + dy, 0, height - box.height)

  return {
    x1,
    y1,
    x2: x1 + box.width,
    y2: y1 + box.height,
    width: box.width,
    height: box.height
  }
}

export default function MeasureBoxEditor({
  item,
  open,
  onOpenChange,
  onSave
}: {
  item: MeasureBatchItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (result: MeasureResultOutput) => void
}) {
  const annotations = useMeasureAnnotations()
  const svgRef = useRef<SVGSVGElement>(null)
  const [reference, setReference] = useState<MeasureBoxOutput | null>(
    () => item.result?.reference.box ?? null
  )
  const [objects, setObjects] = useState<Array<MeasureBoxOutput>>(
    () => item.result?.objects.map((object) => object.box) ?? []
  )
  const [drag, setDrag] = useState<DragState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const result = item.result

  if (!open || !result || !reference) return null

  const imageWidth = result.image.width
  const imageHeight = result.image.height
  const lineWidth = frameLineWidth(imageWidth)
  const handleSize = Math.max(12, imageWidth * 0.01)
  const minSize = Math.max(8, imageWidth * 0.005)

  function toImagePoint(event: React.PointerEvent): { x: number; y: number } {
    const svg = svgRef.current
    const rect = svg?.getBoundingClientRect()

    if (!rect) return { x: 0, y: 0 }

    return {
      x: ((event.clientX - rect.left) / rect.width) * imageWidth,
      y: ((event.clientY - rect.top) / rect.height) * imageHeight
    }
  }

  function boxFor(key: BoxKey): MeasureBoxOutput | null {
    return key.type === 'reference' ? reference : (objects[key.index] ?? null)
  }

  function updateBox(key: BoxKey, next: MeasureBoxOutput): void {
    if (key.type === 'reference') setReference(next)
    else setObjects((current) => current.map((box, index) => (index === key.index ? next : box)))
  }

  function startDrag(event: React.PointerEvent, key: BoxKey, handle: Handle): void {
    event.preventDefault()
    event.stopPropagation()

    const box = boxFor(key)
    if (!box) return

    const point = toImagePoint(event)

    setDrag({
      key,
      handle,
      startX: point.x,
      startY: point.y,
      box
    })
    svgRef.current?.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: React.PointerEvent): void {
    if (!drag) return

    const point = toImagePoint(event)
    const dx = point.x - drag.startX
    const dy = point.y - drag.startY
    const next =
      drag.handle === 'move'
        ? moveBox(drag.box, dx, dy, imageWidth, imageHeight)
        : resizeBox(drag.box, drag.handle, dx, dy, imageWidth, imageHeight, minSize)

    updateBox(drag.key, next)
  }

  function onPointerUp(event: React.PointerEvent): void {
    if (!drag) return

    setDrag(null)
    svgRef.current?.releasePointerCapture(event.pointerId)
  }

  function save(): void {
    if (!result || !reference) return

    try {
      const next = recalculateMeasureResult(result, {
        reference,
        objects: objects.map((box) => box)
      })

      onSave(next)
      onOpenChange(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : ERRORS.measurementFailed)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100svh-var(--title-bar-height)-2rem)] max-w-4xl gap-3 sm:max-w-4xl"
        style={{ top: 'calc(50% + var(--title-bar-height) / 2)' }}
      >
        <DialogHeader className="pr-8">
          <DialogTitle>Adjust boxes</DialogTitle>
          <DialogDescription>
            Drag a box to move it, or drag a corner to resize it. The reference box controls the
            scale.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/20 border-border relative border p-2">
          <div className="relative mx-auto w-fit max-w-full select-none">
            <img
              src={item.photo.dataUrl}
              alt=""
              draggable={false}
              className="block max-h-[calc(100svh-var(--title-bar-height)-14rem)] w-auto max-w-full"
            />
            <svg
              ref={svgRef}
              viewBox={`0 0 ${imageWidth} ${imageHeight}`}
              preserveAspectRatio="none"
              className="absolute inset-0 size-full touch-none"
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <BoxShape
                box={reference}
                color={annotations.reference.color}
                handleSize={handleSize}
                lineWidth={lineWidth}
                onMove={(event) => startDrag(event, { type: 'reference' }, 'move')}
                onResize={(event, handle) => startDrag(event, { type: 'reference' }, handle)}
              />
              {objects.map((box, index) => (
                <BoxShape
                  key={boxKey({ type: 'object', index })}
                  box={box}
                  color={annotations.objects[index]?.color ?? '#34d399'}
                  handleSize={handleSize}
                  lineWidth={lineWidth}
                  onMove={(event) => startDrag(event, { type: 'object', index }, 'move')}
                  onResize={(event, handle) => startDrag(event, { type: 'object', index }, handle)}
                />
              ))}
            </svg>
          </div>
        </div>

        {error ? <p className="text-destructive text-xs">{error}</p> : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setReference(result.reference.box)
              setObjects(result.objects.map((object) => object.box))
              setError(null)
            }}
          >
            Reset
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={save}>
            Save boxes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BoxShape({
  box,
  color,
  handleSize,
  lineWidth,
  onMove,
  onResize
}: {
  box: MeasureBoxOutput
  color: string
  handleSize: number
  lineWidth: number
  onMove: (event: React.PointerEvent) => void
  onResize: (event: React.PointerEvent, handle: Handle) => void
}) {
  return (
    <g>
      <rect
        x={box.x1}
        y={box.y1}
        width={box.width}
        height={box.height}
        fill="transparent"
        stroke={color}
        strokeWidth={lineWidth}
        style={{ cursor: 'move' }}
        onPointerDown={onMove}
      />
      {HANDLES.map((handle) => {
        const x = handle.includes('w') ? box.x1 : box.x2
        const y = handle.includes('n') ? box.y1 : box.y2

        return (
          <rect
            key={handle}
            x={x - handleSize / 2}
            y={y - handleSize / 2}
            width={handleSize}
            height={handleSize}
            fill={color}
            stroke="#09090b"
            strokeWidth={lineWidth / 3}
            style={{
              cursor: handle === 'nw' || handle === 'se' ? 'nwse-resize' : 'nesw-resize'
            }}
            onPointerDown={(event) => onResize(event, handle)}
          />
        )
      })}
    </g>
  )
}
