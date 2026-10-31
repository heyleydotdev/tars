import { EyeIcon, EyeOffIcon, SlidersHorizontalIcon } from 'lucide-react'

import { MEASURE_UNITS } from '@tars/core/constants'
import { Button } from '@tars/ui/components/button'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger
} from '@tars/ui/components/popover'

import type { MeasureFrameSetting } from '../stores/measure-annotations'
import {
  DEFAULT_OBJECT_FRAME,
  MAX_FRAME_FONT_SIZE,
  MIN_FRAME_FONT_SIZE,
  useMeasureAnnotations
} from '../stores/measure-annotations'
import { useMeasurePreferences } from '../stores/measure-preferences'

function FrameRow({
  label,
  setting,
  onChange
}: {
  label: string
  setting: MeasureFrameSetting
  onChange: (patch: Partial<MeasureFrameSetting>) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="min-w-0 truncate">{label}</span>
      <div className="flex shrink-0 items-center gap-1">
        <label
          className="border-border relative size-6 cursor-pointer overflow-hidden border"
          style={{ backgroundColor: setting.color }}
          title={`${label} color`}
        >
          <input
            type="color"
            value={setting.color}
            aria-label={`${label} color`}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            onChange={(event) => onChange({ color: event.target.value })}
          />
        </label>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={setting.visible ? `Hide ${label}` : `Show ${label}`}
          onClick={() => onChange({ visible: !setting.visible })}
        >
          {setting.visible ? <EyeIcon /> : <EyeOffIcon />}
        </Button>
      </div>
    </div>
  )
}

export default function MeasureAnnotationSettings({ objectCount }: { objectCount: number }) {
  const { reference, objects, fontSize, setReference, setObject, setFontSize } =
    useMeasureAnnotations()
  const unit = useMeasurePreferences((state) => state.unit)
  const includeDetails = useMeasurePreferences((state) => state.includeDetails)
  const setUnit = useMeasurePreferences((state) => state.setUnit)
  const setIncludeDetails = useMeasurePreferences((state) => state.setIncludeDetails)

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Annotation settings"
            title="Annotation settings"
          />
        }
      >
        <SlidersHorizontalIcon />
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-60 gap-3">
        <PopoverHeader>
          <PopoverTitle>Annotations</PopoverTitle>
          <PopoverDescription>
            Frame visibility, colors, and relative label size.
          </PopoverDescription>
        </PopoverHeader>

        <div className="flex flex-col gap-2">
          <FrameRow label="Reference" setting={reference} onChange={setReference} />
          {Array.from({ length: objectCount }, (_, index) => {
            const label = `Object ${index + 1}`

            return (
              <FrameRow
                key={label}
                label={label}
                setting={objects[index] ?? DEFAULT_OBJECT_FRAME}
                onChange={(patch) => setObject(index, patch)}
              />
            )
          })}
        </div>

        <div className="border-border flex items-center justify-between gap-3 border-t pt-3">
          <label htmlFor="measure-frame-font" className="text-muted-foreground">
            Label size
          </label>
          <div className="flex items-center gap-2">
            <input
              id="measure-frame-font"
              type="range"
              min={MIN_FRAME_FONT_SIZE}
              max={MAX_FRAME_FONT_SIZE}
              step={1}
              value={fontSize}
              className="w-24 cursor-pointer accent-emerald-400"
              onChange={(event) => setFontSize(event.target.valueAsNumber)}
            />
            <span className="text-foreground w-9 text-right font-mono tabular-nums">
              {fontSize}px
            </span>
          </div>
        </div>

        <div className="border-border flex items-center justify-between gap-3 border-t pt-3">
          <span className="text-muted-foreground">Units</span>
          <div className="flex items-center gap-1">
            {MEASURE_UNITS.map((value) => (
              <Button
                key={value}
                type="button"
                size="xs"
                variant={unit === value ? 'secondary' : 'ghost'}
                onClick={() => setUnit(value)}
              >
                {value}
              </Button>
            ))}
          </div>
        </div>

        <label className="border-border flex items-center justify-between gap-3 border-t pt-3">
          <span className="text-muted-foreground">Details in export</span>
          <input
            type="checkbox"
            checked={includeDetails}
            className="size-3.5 cursor-pointer accent-emerald-400"
            onChange={(event) => setIncludeDetails(event.target.checked)}
          />
        </label>
      </PopoverContent>
    </Popover>
  )
}
