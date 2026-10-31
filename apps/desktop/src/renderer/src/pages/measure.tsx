import { useCallback, useEffect, useState } from 'react'
import { ORPCError } from '@orpc/client'
import { HistoryIcon } from 'lucide-react'

import type { MeasureFormOutput } from '@tars/core/schemas/measure'
import { ERRORS } from '@tars/core/errors'
import { Button } from '@tars/ui/components/button'
import { ButtonGroup } from '@tars/ui/components/button-group'

import type { MeasureBatchItem, MeasureRequest, PreparedMeasureImage } from '../lib/measure'
import ConfirmDialog from '../components/confirm-dialog'
import ConsoleEnd from '../components/console-end'
import ConsoleHeader from '../components/console-header'
import ConsolePanel from '../components/console-panel'
import DashboardShell from '../components/dashboard-shell'
import MeasureAnnotationSettings from '../components/measure-annotation-settings'
import MeasureBatchResults from '../components/measure-batch-results'
import MeasureExportAllButton from '../components/measure-export-all-button'
import MeasureForm from '../components/measure-form'
import MeasureGuideButton from '../components/measure-guide-button'
import MeasureHistorySheet from '../components/measure-history-sheet'
import MeasurePhoto from '../components/measure-photo'
import MeasureSaveButton from '../components/measure-save-button'
import { exportMeasure, measureSummary, useMeasure } from '../lib/measure'
import { useShellAlertStore } from '../stores/alert'
import { useMeasureAnnotations } from '../stores/measure-annotations'
import { useMeasurePreferences } from '../stores/measure-preferences'

export default function Measure() {
  const [items, setItems] = useState<Array<MeasureBatchItem>>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [pendingRestore, setPendingRestore] = useState<Array<MeasureBatchItem> | null>(null)
  const measure = useMeasure()
  const unit = useMeasurePreferences((state) => state.unit)
  const includeDetails = useMeasurePreferences((state) => state.includeDetails)
  const annotations = useMeasureAnnotations()
  const showAlert = useShellAlertStore((state) => state.showAlert)
  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null

  function addPhotos(photos: Array<PreparedMeasureImage>): void {
    const additions = photos.map((photo) => ({
      id: crypto.randomUUID(),
      photo,
      status: 'idle' as const,
      result: null,
      error: null,
      prompts: null,
      request: null
    }))

    setItems((current) => [...current, ...additions])
    setSelectedId(additions[0]?.id ?? null)
  }

  const removePhoto = useCallback(
    (id: string): void => {
      const next = items.filter((item) => item.id !== id)

      setItems(next)

      if (selectedId === id) {
        setSelectedId(next[0]?.id ?? null)
      }
    },
    [items, selectedId]
  )

  function resetResults(): void {
    setItems((current) =>
      current.map((item) => ({
        ...item,
        status: 'idle' as const,
        result: null,
        error: null,
        request: null
      }))
    )
  }

  function setPhotoPrompts(id: string, prompts: Array<string> | null): void {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              prompts,
              status: 'idle' as const,
              result: null,
              error: null,
              request: null
            }
          : item
      )
    )
  }

  function setPhotoResult(id: string, result: MeasureBatchItem['result']): void {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, result, status: result ? 'done' : item.status } : item
      )
    )
  }

  function applyRestore(next: Array<MeasureBatchItem>): void {
    measure.reset()
    setItems(next)
    setSelectedId(next[0]?.id ?? null)
    setPendingRestore(null)
  }

  function requestRestore(next: Array<MeasureBatchItem>): void {
    if (items.length > 0) {
      setPendingRestore(next)
      return
    }

    applyRestore(next)
  }

  const measurePhoto = useCallback(
    async (item: MeasureBatchItem, request: MeasureRequest): Promise<void> => {
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                status: 'measuring' as const,
                result: null,
                error: null,
                request
              }
            : entry
        )
      )

      try {
        const result = await measure.mutateAsync({
          image: item.photo.dataUrl,
          referenceId: request.referenceId,
          prompts: request.prompts
        })

        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? { ...entry, status: 'done' as const, result, error: null, request }
              : entry
          )
        )
      } catch (error) {
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  status: 'error' as const,
                  result: null,
                  error: error instanceof ORPCError ? error.message : ERRORS.measurementFailed,
                  request
                }
              : entry
          )
        )
      }
    },
    [measure]
  )

  async function measureBatch(values: MeasureFormOutput): Promise<string | null> {
    if (items.length === 0) return ERRORS.photoRequired

    const batch = items
    measure.reset()
    setRunning(true)
    resetResults()

    try {
      for (const item of batch) {
        await measurePhoto(item, {
          referenceId: values.referenceId,
          prompts: item.prompts ?? values.prompts
        })
      }
    } finally {
      setRunning(false)
    }

    return null
  }

  const retryPhoto = useCallback(
    async (id: string): Promise<void> => {
      const item = items.find((entry) => entry.id === id)

      if (!item?.request || running) return

      measure.reset()
      setRunning(true)

      try {
        await measurePhoto(item, item.request)
      } finally {
        setRunning(false)
      }
    },
    [items, measure, measurePhoto, running]
  )

  useEffect(() => {
    function isTyping(target: EventTarget | null): boolean {
      return (
        target instanceof HTMLElement &&
        Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
      )
    }

    function onKeyDown(event: KeyboardEvent): void {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return
      if (document.querySelector('.yarl__root, [aria-modal="true"]')) return

      const index = items.findIndex((item) => item.id === selected?.id)

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (items.length === 0) return

        event.preventDefault()

        const delta = event.key === 'ArrowDown' ? 1 : -1
        const next = items[(index + delta + items.length) % items.length]

        if (next) setSelectedId(next.id)

        return
      }

      if (!selected || running) return

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        removePhoto(selected.id)
        return
      }

      if (event.key.toLowerCase() === 'r' && selected.request) {
        event.preventDefault()
        void retryPhoto(selected.id)
        return
      }

      if (event.key.toLowerCase() === 'c' && selected.result) {
        event.preventDefault()
        void window.copyText(measureSummary(selected, unit)).catch(() => {
          showAlert({
            title: 'Copy failed',
            description: 'Could not copy the measurement to the clipboard.',
            variant: 'destructive'
          })
        })
        return
      }

      if (event.key.toLowerCase() === 'e' && selected.result) {
        event.preventDefault()
        void exportMeasure(
          selected.photo,
          selected.result,
          annotations,
          unit,
          includeDetails
        ).catch((error: unknown) => {
          showAlert({
            title: 'Export failed',
            description: error instanceof Error ? error.message : ERRORS.exportFailed,
            variant: 'destructive'
          })
        })
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    annotations,
    includeDetails,
    items,
    removePhoto,
    retryPhoto,
    running,
    selected,
    showAlert,
    unit
  ])

  return (
    <DashboardShell>
      <div className="flex min-h-full flex-col">
        <ConsoleHeader
          title="measure"
          right={
            <ButtonGroup>
              <MeasureAnnotationSettings objectCount={selected?.result?.objects.length ?? 0} />
              <MeasureExportAllButton items={items} />
              <MeasureSaveButton items={items} />
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Measurement history"
                title="Measurement history"
                disabled={running}
                onClick={() => setHistoryOpen(true)}
              >
                <HistoryIcon />
              </Button>
              <MeasureGuideButton />
            </ButtonGroup>
          }
        />

        <div className="bg-border grid flex-1 grid-cols-1 gap-px lg:grid-cols-12">
          <ConsolePanel
            title="photo.input"
            count={String(items.length)}
            accent="bg-sky-400"
            className="lg:col-span-7"
          >
            <MeasurePhoto
              items={items}
              selectedId={selected?.id ?? null}
              unit={unit}
              pending={running}
              onSelect={setSelectedId}
              onRemove={removePhoto}
            />
          </ConsolePanel>

          <ConsolePanel
            title="measure.result"
            count={String(items.length)}
            accent="bg-emerald-400"
            className="lg:col-span-5"
          >
            <MeasureBatchResults
              items={items}
              selectedId={selected?.id ?? null}
              unit={unit}
              pending={running}
              onSelect={setSelectedId}
              onRetry={retryPhoto}
              onPromptsChange={setPhotoPrompts}
              onResultChange={setPhotoResult}
            />
          </ConsolePanel>
        </div>

        <ConsoleEnd />

        <MeasureForm
          photo={items.length > 0}
          pending={running}
          onPhotos={addPhotos}
          onMeasure={measureBatch}
          onChange={resetResults}
        />

        <MeasureHistorySheet
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          onRestore={requestRestore}
        />

        <ConfirmDialog
          title="Replace current batch?"
          description="Opening this run replaces the photos and results currently in Measure."
          confirmLabel="Open run"
          open={Boolean(pendingRestore)}
          pending={false}
          onOpenChange={(next) => {
            if (!next) setPendingRestore(null)
          }}
          onConfirm={() => {
            if (pendingRestore) applyRestore(pendingRestore)
          }}
        />
      </div>
    </DashboardShell>
  )
}
