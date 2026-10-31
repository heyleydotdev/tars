import { useState } from 'react'
import {
  CopyIcon,
  DownloadIcon,
  Maximize2Icon,
  PencilIcon,
  RotateCcwIcon,
  TriangleAlertIcon
} from 'lucide-react'

import type { MeasureResultOutput } from '@tars/core/schemas/measure'
import type { MeasureUnit } from '@tars/core/utils/format'
import { ERRORS } from '@tars/core/errors'
import { formatLength } from '@tars/core/utils/format'
import { measureWarnings } from '@tars/core/utils/measure'
import { Button } from '@tars/ui/components/button'
import { Spinner } from '@tars/ui/components/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@tars/ui/components/tabs'
import { cn } from '@tars/ui/lib/utils'

import type { MeasureBatchItem } from '../lib/measure'
import { exportMeasure, measureSummary } from '../lib/measure'
import { useShellAlertStore } from '../stores/alert'
import { useMeasureAnnotations } from '../stores/measure-annotations'
import { useMeasurePreferences } from '../stores/measure-preferences'
import EmptyState from './empty-state'
import MeasureBoxEditor from './measure-box-editor'
import MeasureOverlay from './measure-overlay'
import MeasurePhotoPrompts from './measure-photo-prompts'
import MeasureResult from './measure-result'
import MeasureViewer from './measure-viewer'

function MeasurePreview({
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

export default function MeasureBatchResults({
  items,
  selectedId,
  unit,
  pending,
  onSelect,
  onRetry,
  onPromptsChange,
  onResultChange
}: {
  items: Array<MeasureBatchItem>
  selectedId: string | null
  unit: MeasureUnit
  pending: boolean
  onSelect: (id: string) => void
  onRetry: (id: string) => void
  onPromptsChange: (id: string, prompts: Array<string> | null) => void
  onResultChange: (id: string, result: MeasureResultOutput) => void
}) {
  const [tab, setTab] = useState<'selected' | 'batch'>('selected')
  const [enlarged, setEnlarged] = useState(false)
  const [editing, setEditing] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const annotations = useMeasureAnnotations()
  const includeDetails = useMeasurePreferences((state) => state.includeDetails)
  const showAlert = useShellAlertStore((state) => state.showAlert)
  const selected = items.find((item) => item.id === selectedId) ?? items[0]

  if (!selected) {
    return <EmptyState title="No Measurements" hint="Browse photos and name an object." />
  }

  const measured = items.filter((item) => item.status === 'done').length
  const failed = items.filter((item) => item.status === 'error').length
  const warnings = selected.result ? measureWarnings(selected.result) : []

  async function copyMeasurement(item: MeasureBatchItem): Promise<void> {
    try {
      await window.copyText(measureSummary(item, unit))
    } catch {
      showAlert({
        title: 'Copy failed',
        description: 'Could not copy the measurement to the clipboard.',
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
      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
        <div>
          <dt className="text-muted-foreground">Photos</dt>
          <dd className="text-foreground font-mono tabular-nums">{items.length}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Measured</dt>
          <dd className="font-mono text-emerald-400 tabular-nums">{measured}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Failed</dt>
          <dd className="text-destructive font-mono tabular-nums">{failed}</dd>
        </div>
      </dl>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as 'selected' | 'batch')}
        className="gap-3"
      >
        <TabsList className="w-full">
          <TabsTrigger value="selected">Selected</TabsTrigger>
          <TabsTrigger value="batch">Batch</TabsTrigger>
        </TabsList>

        <TabsContent value="selected" className="space-y-3">
          <MeasurePreview item={selected} unit={unit} className="aspect-[4/3]">
            <div className="absolute top-2 right-2 z-20 flex gap-1">
              {selected.request && selected.status !== 'measuring' && selected.status !== 'idle' ? (
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
                    aria-label="Adjust boxes"
                    title="Adjust boxes"
                    onClick={() => setEditing(true)}
                  >
                    <PencilIcon />
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
          </MeasurePreview>

          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-foreground min-w-0 truncate" title={selected.photo.name}>
              {selected.photo.name}
            </span>
            <span className="text-muted-foreground font-mono tabular-nums">
              {selected.photo.width}×{selected.photo.height}px
            </span>
          </div>

          <MeasurePhotoPrompts
            item={selected}
            disabled={pending}
            onChange={(prompts) => onPromptsChange(selected.id, prompts)}
          />

          {selected.error ? <p className="text-destructive text-xs">{selected.error}</p> : null}

          {exportError ? <p className="text-destructive text-xs">{exportError}</p> : null}

          {warnings.length > 0 ? (
            <ul className="space-y-1 text-xs">
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
          ) : null}

          {selected.result ? (
            <MeasureResult result={selected.result} unit={unit} />
          ) : selected.status === 'idle' ? (
            <p className="text-muted-foreground text-xs">Not measured yet.</p>
          ) : null}
        </TabsContent>

        <TabsContent value="batch" className="space-y-2">
          <ul className="divide-border border-border divide-y border">
            {items.map((item, index) => {
              const object = item.result?.objects[0]
              const itemWarnings = item.result ? measureWarnings(item.result) : []
              const value =
                item.status === 'done' && object
                  ? `${formatLength(object.widthMm, unit)} × ${formatLength(object.heightMm, unit)}`
                  : (item.error ?? item.status)

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(item.id)
                      setTab('selected')
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-xs',
                      item.id === selected.id ? 'bg-muted/30' : 'hover:bg-muted/20'
                    )}
                  >
                    <span className="text-muted-foreground font-mono">
                      #{String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="text-foreground min-w-0 flex-1 truncate">
                      {item.photo.name}
                    </span>
                    {itemWarnings.length > 0 ? (
                      <TriangleAlertIcon className="size-3 shrink-0 text-amber-300" />
                    ) : null}
                    <span
                      className={cn(
                        'shrink-0 font-mono text-xs',
                        item.status === 'error'
                          ? 'text-destructive'
                          : item.status === 'done'
                            ? 'text-foreground tabular-nums'
                            : 'text-muted-foreground uppercase'
                      )}
                    >
                      {value}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </TabsContent>
      </Tabs>

      <MeasureViewer
        item={selected}
        open={enlarged}
        annotations={annotations}
        unit={unit}
        onClose={() => setEnlarged(false)}
      />

      <MeasureBoxEditor
        key={`${selected.id}-${editing}-${selected.result?.scaleMmPerPx ?? 0}`}
        item={selected}
        open={editing}
        onOpenChange={setEditing}
        onSave={(result) => onResultChange(selected.id, result)}
      />
    </div>
  )
}
