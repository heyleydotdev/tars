import { useState } from 'react'
import {
  CopyIcon,
  DownloadIcon,
  Maximize2Icon,
  RotateCcwIcon,
  TriangleAlertIcon
} from 'lucide-react'

import type { MeasureUnit } from '@tars/core/schemas/measure'
import { ERRORS } from '@tars/core/errors'
import { formatLength } from '@tars/core/utils/format'
import { measureWarnings } from '@tars/core/utils/measure'
import { titleCase } from '@tars/core/utils/string'
import { Button } from '@tars/ui/components/button'
import { Spinner } from '@tars/ui/components/spinner'
import { cn } from '@tars/ui/lib/utils'

import type { MeasureBatchItem } from '../lib/measure'
import { exportMeasure, measureSummary } from '../lib/measure'
import { useShellAlertStore } from '../stores/alert'
import { useMeasureAnnotations } from '../stores/measure-annotations'
import { useMeasurePreferences } from '../stores/measure-preferences'
import EmptyState from './empty-state'
import MeasureOverlay from './measure-overlay'
import MeasurePhotoPrompts from './measure-photo-prompts'
import MeasureViewer from './measure-viewer'

function DetailRow({
  label,
  mono = true,
  children
}: React.PropsWithChildren<{ label: string; mono?: boolean }>) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] items-start gap-3 px-3 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('min-w-0', mono ? 'font-mono tabular-nums' : '')}>{children}</dd>
    </div>
  )
}

export function MeasurePreviewImage({
  item,
  unit,
  className,
  children
}: React.PropsWithChildren<{
  item: MeasureBatchItem
  unit: MeasureUnit
  className?: string
}>) {
  const annotations = useMeasureAnnotations()

  return (
    <div
      className={cn(
        'bg-muted/20 border-border relative flex items-center justify-center overflow-hidden border',
        className
      )}
    >
      {item.result ? (
        <MeasureOverlay
          image={item.photo.dataUrl}
          result={item.result}
          annotations={annotations}
          unit={unit}
        />
      ) : (
        <img
          src={item.photo.dataUrl}
          alt={item.photo.name}
          className="max-h-full max-w-full object-contain"
        />
      )}
      {item.status === 'measuring' ? (
        <div className="bg-background/60 absolute inset-0 flex items-center justify-center">
          <Spinner className="text-amber-300" />
        </div>
      ) : null}
      {children}
    </div>
  )
}

export default function MeasurePreview({
  items,
  selectedId,
  unit,
  pending = false,
  onRetry,
  onPromptsChange,
  emptyHint = 'Browse photos and name an object.'
}: {
  items: Array<MeasureBatchItem>
  selectedId: string | null
  unit: MeasureUnit
  pending?: boolean
  onRetry?: (id: string) => void
  onPromptsChange?: (id: string, prompts: Array<string> | null) => void
  emptyHint?: string
}) {
  const [enlarged, setEnlarged] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const annotations = useMeasureAnnotations()
  const includeDetails = useMeasurePreferences((state) => state.includeDetails)
  const showAlert = useShellAlertStore((state) => state.showAlert)
  const selected = items.find((item) => item.id === selectedId) ?? items[0]

  if (!selected) return <EmptyState title="No Measurements" hint={emptyHint} />

  const measured = items.filter((item) => item.status === 'done').length
  const failed = items.filter((item) => item.status === 'error').length
  const warnings = selected.result ? measureWarnings(selected.result) : []
  const prompts = selected.prompts ?? selected.request?.prompts ?? selected.result?.prompts ?? []

  async function copyMeasurement(item: MeasureBatchItem): Promise<void> {
    try {
      await window.copyText(measureSummary(item, unit))
    } catch {
      showAlert({
        title: ERRORS.copyFailedTitle,
        description: ERRORS.copyFailedDetail,
        variant: 'destructive'
      })
    }
  }

  async function exportMeasurement(item: MeasureBatchItem): Promise<void> {
    const result = item.result

    if (!result) return

    try {
      await exportMeasure(item.photo, result, annotations, unit, includeDetails)
      setExportError(null)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : ERRORS.exportFailed)
    }
  }

  return (
    <div className="space-y-3 p-3">
      <MeasurePreviewImage item={selected} unit={unit} className="aspect-4/3">
        <div className="absolute top-2 right-2 z-20 flex gap-1">
          {onRetry &&
          selected.request &&
          selected.status !== 'measuring' &&
          selected.status !== 'idle' ? (
            <Button
              variant="secondary"
              size="icon-xs"
              aria-label="Retry measurement"
              title="Retry measurement"
              disabled={pending}
              onClick={() => onRetry(selected.id)}
            >
              <RotateCcwIcon />
            </Button>
          ) : null}
          {selected.result ? (
            <>
              <Button
                variant="secondary"
                size="icon-xs"
                aria-label="Copy measurement"
                title="Copy measurement"
                onClick={() => {
                  void copyMeasurement(selected)
                }}
              >
                <CopyIcon />
              </Button>
              <Button
                variant="secondary"
                size="icon-xs"
                aria-label="Export measurement"
                title="Export measurement"
                onClick={() => {
                  void exportMeasurement(selected)
                }}
              >
                <DownloadIcon />
              </Button>
            </>
          ) : null}
          <Button
            variant="secondary"
            size="icon-xs"
            aria-label="Enlarge preview"
            onClick={() => setEnlarged(true)}
          >
            <Maximize2Icon />
          </Button>
        </div>
      </MeasurePreviewImage>

      <dl className="divide-border border-border divide-y border text-xs">
        {items.length > 1 ? (
          <>
            <DetailRow label="Photos">{items.length}</DetailRow>
            <DetailRow label="Measured">
              <span className="text-emerald-400">{measured}</span>
            </DetailRow>
            <DetailRow label="Failed">
              <span className="text-destructive">{failed}</span>
            </DetailRow>
          </>
        ) : null}

        <DetailRow label="File" mono={false}>
          <span className="block truncate" title={selected.photo.name}>
            {selected.photo.name}
          </span>
        </DetailRow>
        <DetailRow label="Size">
          {selected.photo.width}×{selected.photo.height}px
        </DetailRow>

        {selected.result ? (
          <>
            <DetailRow label="Reference" mono={false}>
              {titleCase(selected.result.reference.label)}
            </DetailRow>
            {selected.result.objects.map((object, index) => (
              <DetailRow
                key={`${object.box.x1}-${object.box.y1}-${index}`}
                label={
                  selected.result && selected.result.objects.length > 1
                    ? `#${index + 1} ${titleCase(object.prompt)}`
                    : titleCase(object.prompt)
                }
              >
                {formatLength(object.widthMm, unit)} × {formatLength(object.heightMm, unit)}
              </DetailRow>
            ))}
            <DetailRow label="Matches">{selected.result.reference.matches}</DetailRow>
            <DetailRow label="Scale">
              <span className="text-sky-400">{selected.result.scaleMmPerPx.toFixed(3)} mm/px</span>
            </DetailRow>
            <DetailRow label="Ref box">
              {Math.round(selected.result.reference.box.width)}×
              {Math.round(selected.result.reference.box.height)}px
            </DetailRow>
          </>
        ) : (
          <DetailRow label="Status" mono={false}>
            {selected.status === 'measuring'
              ? 'Measuring…'
              : selected.status === 'error'
                ? (selected.error ?? 'Measurement failed.')
                : 'Not measured yet.'}
          </DetailRow>
        )}

        {prompts.length > 0 ? (
          <DetailRow label="Prompts" mono={false}>
            {onPromptsChange ? (
              <MeasurePhotoPrompts
                item={selected}
                disabled={pending}
                onChange={(next) => onPromptsChange(selected.id, next)}
              />
            ) : (
              <span>{prompts.join(', ')}</span>
            )}
          </DetailRow>
        ) : null}

        {warnings.length > 0 ? (
          <DetailRow label="Warnings" mono={false}>
            <ul className="space-y-1">
              {warnings.map((warning, index) => (
                <li
                  key={`${warning.code}-${index}`}
                  className="flex items-start gap-1.5 text-amber-300"
                >
                  <TriangleAlertIcon className="mt-0.5 size-3 shrink-0" />
                  <span>{warning.message}</span>
                </li>
              ))}
            </ul>
          </DetailRow>
        ) : null}

        {selected.error && selected.result ? (
          <DetailRow label="Error" mono={false}>
            <span className="text-destructive">{selected.error}</span>
          </DetailRow>
        ) : null}

        {exportError ? (
          <DetailRow label="Export" mono={false}>
            <span className="text-destructive">{exportError}</span>
          </DetailRow>
        ) : null}
      </dl>

      <MeasureViewer
        item={selected}
        open={enlarged}
        annotations={annotations}
        unit={unit}
        onClose={() => setEnlarged(false)}
      />
    </div>
  )
}
