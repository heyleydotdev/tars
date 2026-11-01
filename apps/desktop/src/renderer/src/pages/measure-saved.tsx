import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CopyIcon, FileSpreadsheetIcon, RotateCcwIcon, Trash2Icon } from 'lucide-react'
import { useNavigate } from 'react-router'

import type { MeasureSavedOutput, MeasureUnit } from '@tars/core/schemas/measure'
import { ERRORS } from '@tars/core/errors'
import { formatDateTime, formatLength } from '@tars/core/utils/format'
import { Button } from '@tars/ui/components/button'
import { ButtonGroup } from '@tars/ui/components/button-group'
import { Spinner } from '@tars/ui/components/spinner'
import { cn } from '@tars/ui/lib/utils'

import ConfirmDialog from '../components/confirm-dialog'
import ConsoleHeader from '../components/console-header'
import ConsolePanel from '../components/console-panel'
import EmptyState from '../components/empty-state'
import MeasurePreview from '../components/measure-preview'
import { fileSrc } from '../lib/files'
import { downloadText, measureCsv } from '../lib/measure'
import {
  fetchMeasureImage,
  measureSavedKey,
  removeSavedMeasure,
  savedMeasureItem,
  useSavedMeasures
} from '../lib/measure-history'
import { useShellAlertStore } from '../stores/alert'
import { useMeasurePreferences } from '../stores/measure-preferences'
import { useMeasureWorkspace } from '../stores/measure-workspace'

function measureValue(measure: MeasureSavedOutput, unit: MeasureUnit): string {
  const object = measure.result?.objects[0]

  if (!object) return measure.error ?? measure.status

  return `${formatLength(object.widthMm, unit)} × ${formatLength(object.heightMm, unit)}`
}

export default function MeasureSaved() {
  const saved = useSavedMeasures()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const unit = useMeasurePreferences((state) => state.unit)
  const requestRestore = useMeasureWorkspace((state) => state.requestRestore)
  const showAlert = useShellAlertStore((state) => state.showAlert)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<MeasureSavedOutput | null>(null)
  const [deletePending, setDeletePending] = useState(false)
  const measures = useMemo(
    () => saved.data?.pages.flatMap((page) => page.items) ?? [],
    [saved.data]
  )
  const selected = measures.find((measure) => measure.id === selectedId) ?? measures[0] ?? null
  const image = useQuery({
    queryKey: ['measure-image', selected?.id],
    queryFn: () => fetchMeasureImage(selected?.imageUrl ?? ''),
    enabled: Boolean(selected),
    retry: false
  })
  const item = selected && image.data ? savedMeasureItem(selected, image.data) : null
  const sentinel = useRef<HTMLDivElement>(null)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = saved

  useEffect(() => {
    const node = sentinel.current

    if (!node) return

    // Fires even when the list is too short to scroll, so every page loads.
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage()
      }
    })

    observer.observe(node)

    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  function reportError(error: unknown): void {
    showAlert({
      title: ERRORS.exportFailedTitle,
      description: error instanceof Error ? error.message : ERRORS.exportFailed,
      variant: 'destructive'
    })
  }

  function exportCsv(): void {
    if (!item) return

    try {
      downloadText(measureCsv([item], unit), `${item.photo.name}.csv`, 'text/csv;charset=utf-8')
    } catch (error) {
      reportError(error)
    }
  }

  async function copyCsv(): Promise<void> {
    if (!item) return

    try {
      await window.copyText(measureCsv([item], unit))
    } catch (error) {
      reportError(error)
    }
  }

  function openMeasure(): void {
    if (!item || !selected) return

    requestRestore(
      [
        {
          id: item.id,
          photo: item.photo,
          status: 'idle',
          result: null,
          error: null,
          prompts: null,
          notice: null,
          request: null
        }
      ],
      selected.referenceId
        ? { referenceId: selected.referenceId, prompts: selected.prompts }
        : null,
      selected.runId
    )
    navigate('/measure')
  }

  async function remove(): Promise<void> {
    if (!deleting) return

    setDeletePending(true)

    try {
      await removeSavedMeasure(deleting.id)
      await queryClient.invalidateQueries({ queryKey: measureSavedKey })
      queryClient.removeQueries({ queryKey: ['measure-image', deleting.id] })

      if (selected?.id === deleting.id) setSelectedId(null)

      setDeleting(null)
    } catch (error) {
      showAlert({
        title: ERRORS.deleteFailed,
        description: error instanceof Error ? error.message : ERRORS.historyDeleteFailed,
        variant: 'destructive'
      })
    } finally {
      setDeletePending(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <ConsoleHeader title="measure.saved" />

      <div className="bg-border grid flex-1 grid-cols-1 gap-px lg:min-h-0 lg:grid-cols-12">
        <ConsolePanel
          title="measure.saved"
          count={String(measures.length)}
          accent="bg-sky-400"
          className="lg:col-span-7"
        >
          {saved.isPending ? (
            <div className="text-muted-foreground flex items-center gap-2 p-4 text-xs">
              <Spinner className="size-3.5" />
              Loading saved measurements…
            </div>
          ) : saved.isError ? (
            <p className="text-destructive p-4 text-xs">{ERRORS.historyLoadFailed}</p>
          ) : measures.length === 0 ? (
            <EmptyState
              title="No Saved Measurements"
              hint="Measurements are saved automatically."
            />
          ) : (
            <ul className="divide-border border-border divide-y border">
              {measures.map((measure) => (
                <li key={measure.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(measure.id)}
                    className={cn(
                      'hover:bg-muted/60 flex w-full items-center gap-2 p-2 text-left transition-colors',
                      measure.id === selected?.id ? 'bg-muted/40' : ''
                    )}
                  >
                    <img
                      src={fileSrc(measure.thumbUrl)}
                      alt=""
                      className="bg-muted size-14 shrink-0 object-cover"
                    />
                    <span className="min-w-0 flex-1 text-xs">
                      <span className="text-foreground block truncate font-medium">
                        {measure.name}
                      </span>
                      <span className="text-muted-foreground block truncate">
                        {measure.referenceLabel} · {measureValue(measure, unit)}
                      </span>
                      <span className="text-muted-foreground block font-mono tabular-nums">
                        {formatDateTime(measure.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div ref={sentinel} className="h-px" />
          {saved.isFetchingNextPage ? (
            <p className="text-muted-foreground flex items-center gap-2 px-3 pb-3 text-xs">
              <Spinner className="size-3.5" />
              Loading more…
            </p>
          ) : null}
        </ConsolePanel>

        <ConsolePanel
          title="measure.preview"
          count={item ? '1' : '0'}
          accent="bg-emerald-400"
          className="lg:col-span-5"
        >
          {!selected ? (
            <EmptyState title="No Measurement Selected" hint="Pick a saved measurement." />
          ) : image.isPending ? (
            <div className="grid place-items-center p-6">
              <Spinner className="text-emerald-400" />
            </div>
          ) : image.isError || !item ? (
            <p className="text-destructive p-4 text-xs">{ERRORS.historyLoadFailed}</p>
          ) : (
            <div className="space-y-3 p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-foreground min-w-0 flex-1 truncate">{selected.name}</span>
                <span className="text-muted-foreground font-mono tabular-nums">
                  {formatDateTime(selected.createdAt)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                <ButtonGroup>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Export CSV"
                    title="Export CSV"
                    onClick={exportCsv}
                  >
                    <FileSpreadsheetIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Copy CSV"
                    title="Copy CSV"
                    onClick={() => void copyCsv()}
                  >
                    <CopyIcon />
                  </Button>
                </ButtonGroup>
                <ButtonGroup className="ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Open in measure"
                    title="Open in measure"
                    onClick={openMeasure}
                  >
                    <RotateCcwIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Delete measurement"
                    title="Delete measurement"
                    onClick={() => setDeleting(selected)}
                  >
                    <Trash2Icon />
                  </Button>
                </ButtonGroup>
              </div>

              <MeasurePreview items={[item]} selectedId={item.id} unit={unit} />
            </div>
          )}
        </ConsolePanel>
      </div>

      <ConfirmDialog
        title="Delete saved measurement?"
        description="This removes the saved image and result."
        confirmLabel="Delete"
        destructive
        open={Boolean(deleting)}
        pending={deletePending}
        onOpenChange={(next) => {
          if (!next) setDeleting(null)
        }}
        onConfirm={() => void remove()}
      />
    </div>
  )
}
