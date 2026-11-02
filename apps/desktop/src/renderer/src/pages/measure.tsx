import { useCallback, useEffect, useRef, useState } from 'react'
import { ORPCError } from '@orpc/client'
import { useQueryClient } from '@tanstack/react-query'
import { useLoaderData } from 'react-router'
import { useShallow } from 'zustand/react/shallow'

import type { MeasureFormOutput, MeasureResultOutput } from '@tars/core/schemas/measure'
import {
  MEASURE_BATCH_GAP_MS,
  MEASURE_BATCH_LIMIT,
  MEASURE_RATE_LIMIT_MAX_MS,
  MEASURE_RATE_LIMIT_RETRIES
} from '@tars/core/constants'
import { ERRORS } from '@tars/core/errors'
import { sleep } from '@tars/core/utils/time'
import { ButtonGroup } from '@tars/ui/components/button-group'
import { Checkbox } from '@tars/ui/components/checkbox'

import type { MeasureLoaderData } from '../lib/loaders'
import type { MeasureBatchItem, MeasureRequest, PreparedMeasureImage } from '../lib/measure'
import ConfirmDialog from '../components/confirm-dialog'
import ConsoleHeader from '../components/console-header'
import ConsolePanel from '../components/console-panel'
import ConsoleTabs from '../components/console-tabs'
import MeasureAnnotationSettings from '../components/measure-annotation-settings'
import MeasureExportAllButton from '../components/measure-export-all-button'
import MeasureForm from '../components/measure-form'
import MeasureGuideButton from '../components/measure-guide-button'
import MeasurePhoto from '../components/measure-photo'
import MeasurePreview from '../components/measure-preview'
import MeasureSaved from '../components/measure-saved'
import PendingNavigationGuard from '../components/pending-navigation-guard'
import { useLogActivity } from '../lib/journal'
import {
  exportMeasure,
  hasResult,
  measureRateLimitDelayMs,
  measureSummary,
  useMeasure
} from '../lib/measure'
import {
  measureSavedKey,
  removeSavedMeasure,
  saveMeasureRun,
  updateSavedMeasures
} from '../lib/measure-history'
import { useShellAlertStore } from '../stores/alert'
import { useMeasureAnnotations } from '../stores/measure-annotations'
import { useMeasurePreferences } from '../stores/measure-preferences'
import { useMeasureWorkspace } from '../stores/measure-workspace'

export default function Measure() {
  const initialReferences = useLoaderData<MeasureLoaderData>()
  const { items, selectedId, running, pendingRestore } = useMeasureWorkspace(
    useShallow((state) => ({
      items: state.items,
      selectedId: state.selectedId,
      running: state.running,
      pendingRestore: state.pendingRestore
    }))
  )
  const {
    selectPhoto,
    updateItem,
    setPrompts,
    clearResults,
    setRunning,
    confirmRestore,
    dismissRestore
  } = useMeasureWorkspace(
    useShallow((state) => ({
      selectPhoto: state.selectPhoto,
      updateItem: state.updateItem,
      setPrompts: state.setPrompts,
      clearResults: state.clearResults,
      setRunning: state.setRunning,
      confirmRestore: state.confirmRestore,
      dismissRestore: state.dismissRestore
    }))
  )
  const addPhotos = useMeasureWorkspace((state) => state.addPhotos)
  const removePhoto = useMeasureWorkspace((state) => state.removePhoto)
  const draftSeed = useMeasureWorkspace((state) => state.draftSeed)
  const setSavedRunId = useMeasureWorkspace((state) => state.setSavedRunId)
  const queryClient = useQueryClient()
  const saveTimer = useRef<number | null>(null)
  const pendingSaves = useRef(new Set<string>())
  const [section, setSection] = useState('workspace')
  const [savedSeen, setSavedSeen] = useState(false)
  const [pendingMeasure, setPendingMeasure] = useState<{
    values: MeasureFormOutput
    skipMeasured: boolean
  } | null>(null)
  const measure = useMeasure()
  const logActivity = useLogActivity()
  const unit = useMeasurePreferences((state) => state.unit)
  const includeDetails = useMeasurePreferences((state) => state.includeDetails)
  const annotations = useMeasureAnnotations()
  const showAlert = useShellAlertStore((state) => state.showAlert)
  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null
  const measuredCount = items.filter(hasResult).length
  const unmeasuredCount = items.length - measuredCount

  const measurePhoto = useCallback(
    async (
      item: MeasureBatchItem,
      request: MeasureRequest
    ): Promise<MeasureResultOutput | null> => {
      updateItem(item.id, { status: 'measuring', result: null, error: null, request, notice: null })

      for (let attempt = 0; ; attempt += 1) {
        try {
          const result = await measure.mutateAsync({
            image: item.photo.dataUrl,
            referenceId: request.referenceId,
            prompts: request.prompts
          })

          updateItem(item.id, { status: 'done', result, error: null, request, notice: null })

          return result
        } catch (error) {
          const delay = measureRateLimitDelayMs(error)
          const retryable = delay !== null && delay <= MEASURE_RATE_LIMIT_MAX_MS

          if (retryable && attempt < MEASURE_RATE_LIMIT_RETRIES) {
            updateItem(item.id, {
              notice: `Rate limited · retrying in ${Math.ceil(delay / 1_000)}s`
            })
            await sleep(delay)
            continue
          }

          updateItem(item.id, {
            status: 'error',
            result: null,
            error: error instanceof ORPCError ? error.message : ERRORS.measurementFailed,
            request,
            notice: null
          })

          return null
        }
      }
    },
    [measure, updateItem]
  )

  const flushSaves = useCallback(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current)

    saveTimer.current = null

    const { items: snapshot, savedRunId } = useMeasureWorkspace.getState()
    const ids = pendingSaves.current

    pendingSaves.current = new Set()

    if (!savedRunId || ids.size === 0) return

    void updateSavedMeasures(snapshot.filter((item) => ids.has(item.id))).catch(
      (error: unknown) => {
        showAlert({
          title: ERRORS.saveFailedTitle,
          description: error instanceof Error ? error.message : ERRORS.historySaveFailed,
          variant: 'destructive'
        })
      }
    )
  }, [showAlert])

  const scheduleSave = useCallback(
    (id: string) => {
      pendingSaves.current.add(id)
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(flushSaves, 800)
    },
    [flushSaves]
  )

  useEffect(() => () => flushSaves(), [flushSaves])

  const logCompleted = useCallback(
    async (completed: Array<MeasureBatchItem>, runId: string): Promise<void> => {
      const measured = completed.filter(hasResult)

      if (measured.length === 0) return

      const objectCount = measured.reduce((sum, item) => sum + item.result.objects.length, 0)

      try {
        await logActivity.mutateAsync({
          events: [
            {
              type: 'measure.completed',
              runId,
              photoCount: measured.length,
              objectCount,
              occurredAt: new Date().toISOString()
            }
          ]
        })
      } catch {
        showAlert({
          title: ERRORS.saveFailedTitle,
          description: ERRORS.journalLogFailed,
          variant: 'destructive'
        })
      }
    },
    [logActivity, showAlert]
  )

  async function measureBatch(
    values: MeasureFormOutput,
    targets: Array<MeasureBatchItem>
  ): Promise<string | null> {
    if (targets.length === 0) return ERRORS.photoRequired

    const completed: Array<MeasureBatchItem> = []
    const runId = crypto.randomUUID()
    measure.reset()
    setRunning(true)
    clearResults(targets.map((item) => item.id))

    try {
      for (const [index, item] of targets.entries()) {
        if (index > 0) await sleep(MEASURE_BATCH_GAP_MS)

        const result = await measurePhoto(item, {
          referenceId: values.referenceId,
          prompts: item.prompts ?? values.prompts
        })

        if (result) completed.push({ ...item, result })
      }
    } finally {
      setRunning(false)
    }

    await logCompleted(completed, runId)

    if (completed.length > 0) {
      try {
        const measured = useMeasureWorkspace.getState().items.filter(hasResult)

        // Re-measuring replaces these photos' saved copies instead of adding new ones.
        await Promise.all(
          measured.map((item) => removeSavedMeasure(item.id).catch(() => undefined))
        )

        const savedRunId = await saveMeasureRun(
          measured,
          measured.at(0)?.result.prompts ?? values.prompts,
          unit
        )

        setSavedRunId(savedRunId)
        await queryClient.invalidateQueries({ queryKey: measureSavedKey })
      } catch (error) {
        showAlert({
          title: ERRORS.saveFailedTitle,
          description: error instanceof Error ? error.message : ERRORS.historySaveFailed,
          variant: 'destructive'
        })
      }
    }

    return null
  }

  function requestMeasure(values: MeasureFormOutput): Promise<string | null> {
    if (!items.some(hasResult)) return measureBatch(values, items)

    setPendingMeasure({ values, skipMeasured: false })

    return Promise.resolve(null)
  }

  const retryPhoto = useCallback(
    async (id: string): Promise<void> => {
      const item = items.find((entry) => entry.id === id)

      if (!item?.request || running) return

      measure.reset()
      setRunning(true)

      try {
        const result = await measurePhoto(item, item.request)

        if (result) {
          await logCompleted([{ ...item, result }], crypto.randomUUID())
          scheduleSave(item.id)
        }
      } finally {
        setRunning(false)
      }
    },
    [items, logCompleted, measure, measurePhoto, running, scheduleSave, setRunning]
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

        if (next) selectPhoto(next.id)

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
            title: ERRORS.copyFailedTitle,
            description: ERRORS.copyFailedDetail,
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
            title: ERRORS.exportFailedTitle,
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
    selectPhoto,
    selected,
    showAlert,
    unit
  ])

  function addBatchPhotos(photos: Array<PreparedMeasureImage>): void {
    if (items.length + photos.length > MEASURE_BATCH_LIMIT) {
      showAlert({
        title: ERRORS.measureBatchFullTitle,
        description: ERRORS.measureBatchFull,
        variant: 'destructive'
      })
      return
    }

    addPhotos(photos)
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <ConsoleHeader
        title="measure"
        right={
          <ButtonGroup>
            <MeasureAnnotationSettings objectCount={selected?.result?.objects.length ?? 0} />
            <MeasureExportAllButton items={items} />
            <MeasureGuideButton />
          </ButtonGroup>
        }
      />

      <ConsoleTabs
        value={section}
        fill={false}
        onValueChange={(value) => {
          setSection(value)
          if (value === 'saved') setSavedSeen(true)
        }}
        items={[
          { value: 'workspace', label: 'Workspace' },
          { value: 'saved', label: 'Saved' }
        ]}
      />

      {savedSeen ? (
        <div className={`flex min-h-0 flex-1 flex-col ${section === 'saved' ? '' : 'hidden'}`}>
          <MeasureSaved onOpen={() => setSection('workspace')} />
        </div>
      ) : null}

      {section === 'workspace' ? (
        <>
          <div className="bg-border grid flex-1 grid-cols-1 gap-px lg:min-h-0 lg:grid-cols-12">
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
                onSelect={selectPhoto}
                onRemove={removePhoto}
              />
            </ConsolePanel>

            <ConsolePanel
              title="measure.preview"
              count={selected ? '1' : '0'}
              accent="bg-emerald-400"
              className="lg:col-span-5"
            >
              <MeasurePreview
                items={items}
                selectedId={selected?.id ?? null}
                unit={unit}
                pending={running}
                onRetry={retryPhoto}
                onPromptsChange={setPrompts}
              />
            </ConsolePanel>
          </div>

          <MeasureForm
            key={draftSeed}
            initialReferences={initialReferences}
            photo={items.length > 0}
            pending={running}
            onPhotos={addBatchPhotos}
            onMeasure={requestMeasure}
          />
        </>
      ) : null}

      <PendingNavigationGuard when={running} />

      <ConfirmDialog
        title="Replace current batch?"
        description="Opening this measurement replaces the photos and results currently in Measure."
        confirmLabel="Open measurement"
        open={Boolean(pendingRestore)}
        pending={false}
        onOpenChange={(next) => {
          if (!next) dismissRestore()
        }}
        onConfirm={() => {
          measure.reset()
          confirmRestore()
        }}
      />

      <ConfirmDialog
        title="Measure again?"
        description={
          pendingMeasure?.skipMeasured
            ? `Only the ${unmeasuredCount} ${unmeasuredCount === 1 ? 'photo' : 'photos'} without results will be measured.`
            : `${measuredCount} ${measuredCount === 1 ? 'photo is' : 'photos are'} already measured. Measuring again replaces the current results.`
        }
        confirmLabel={pendingMeasure?.skipMeasured ? 'Measure missing' : 'Measure again'}
        open={Boolean(pendingMeasure)}
        pending={false}
        onOpenChange={(next) => {
          if (!next) setPendingMeasure(null)
        }}
        onConfirm={() => {
          const pending = pendingMeasure

          setPendingMeasure(null)

          if (!pending) return

          const targets = pending.skipMeasured ? items.filter((item) => !hasResult(item)) : items

          if (targets.length > 0) void measureBatch(pending.values, targets)
        }}
      >
        {pendingMeasure && unmeasuredCount > 0 ? (
          <label htmlFor="measure-skip-measured" className="flex items-start gap-2">
            <Checkbox
              id="measure-skip-measured"
              checked={pendingMeasure.skipMeasured}
              onCheckedChange={(checked) =>
                setPendingMeasure((current) =>
                  current ? { ...current, skipMeasured: checked } : current
                )
              }
            />
            <span className="text-muted-foreground text-xs">
              Only measure the {unmeasuredCount} photo{unmeasuredCount === 1 ? '' : 's'} without
              results
            </span>
          </label>
        ) : null}
      </ConfirmDialog>
    </div>
  )
}
