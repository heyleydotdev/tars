import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { HistoryIcon, Loader2Icon, Trash2Icon } from 'lucide-react'

import type { MeasureHistorySummaryOutput } from '@tars/core/schemas/measure'
import { ERRORS } from '@tars/core/errors'
import { formatDateTime } from '@tars/core/utils/format'
import { Button } from '@tars/ui/components/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@tars/ui/components/sheet'

import type { MeasureBatchItem } from '../lib/measure'
import { deleteMeasureRun, loadMeasureRun } from '../lib/measure-history'
import { orpc } from '../lib/orpc'
import { useShellAlertStore } from '../stores/alert'
import ConfirmDialog from './confirm-dialog'

export default function MeasureHistorySheet({
  open,
  onOpenChange,
  onRestore
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRestore: (items: Array<MeasureBatchItem>) => void
}) {
  const queryClient = useQueryClient()
  const showAlert = useShellAlertStore((state) => state.showAlert)
  const history = useQuery({
    ...orpc.measure.history.list.queryOptions(),
    enabled: open
  })
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<MeasureHistorySummaryOutput | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  async function restore(run: MeasureHistorySummaryOutput): Promise<void> {
    setOpeningId(run.id)

    try {
      const { detail, photos } = await loadMeasureRun(run.id)
      const items: Array<MeasureBatchItem> = detail.items.flatMap((item) => {
        const dataUrl = photos[item.id]

        if (!dataUrl) return []

        return [
          {
            id: item.id,
            photo: {
              dataUrl,
              width: item.imageWidth,
              height: item.imageHeight,
              name: item.name
            },
            status: item.status,
            result: item.result,
            error: item.error,
            prompts: null,
            request: detail.referenceId
              ? {
                  referenceId: detail.referenceId,
                  prompts: item.result?.prompts ?? detail.prompts
                }
              : null
          }
        ]
      })

      onRestore(items)
      onOpenChange(false)
    } catch (error) {
      showAlert({
        title: 'History',
        description: error instanceof Error ? error.message : ERRORS.historyLoadFailed,
        variant: 'destructive'
      })
    } finally {
      setOpeningId(null)
    }
  }

  async function remove(): Promise<void> {
    if (!deleting) return

    setDeletePending(true)

    try {
      await deleteMeasureRun(deleting.id)
      await queryClient.invalidateQueries({ queryKey: orpc.measure.history.list.queryKey() })
      setDeleting(null)
    } catch (error) {
      showAlert({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : ERRORS.historyDeleteFailed,
        variant: 'destructive'
      })
    } finally {
      setDeletePending(false)
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="data-[side=right]:sm:max-w-md [&>button]:data-[slot=sheet-close]:top-0.5! [&>button]:data-[slot=sheet-close]:right-1.5!"
          style={{
            top: 'var(--title-bar-height)',
            height: 'calc(100svh - var(--title-bar-height))'
          }}
        >
          <SheetHeader className="flex-row items-center gap-2 border-b px-3 py-2 pr-10">
            <HistoryIcon className="text-muted-foreground size-3.5" />
            <SheetTitle className="font-mono text-xs">measure.history</SheetTitle>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {history.isPending ? (
              <div className="text-muted-foreground flex items-center gap-2 p-4 text-xs">
                <Loader2Icon className="size-3.5 animate-spin" />
                Loading history…
              </div>
            ) : history.isError ? (
              <p className="text-destructive p-4 text-xs">{ERRORS.historyLoadFailed}</p>
            ) : history.data.items.length === 0 ? (
              <p className="text-muted-foreground p-4 text-xs">No saved measurement runs yet.</p>
            ) : (
              <ul className="divide-border border-border divide-y border">
                {history.data.items.map((run) => (
                  <li key={run.id} className="space-y-2 p-2">
                    <div className="flex gap-2">
                      <img
                        src={run.coverThumb}
                        alt=""
                        className="bg-muted size-14 shrink-0 object-cover"
                      />
                      <div className="min-w-0 flex-1 text-xs">
                        <p className="text-foreground truncate font-medium">{run.referenceLabel}</p>
                        <p className="text-muted-foreground truncate">{run.prompts.join(', ')}</p>
                        <p className="text-muted-foreground font-mono tabular-nums">
                          {run.measuredCount}/{run.itemCount} · {formatDateTime(run.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        aria-label={`Delete run from ${run.referenceLabel}`}
                        disabled={openingId !== null || deletePending}
                        onClick={() => setDeleting(run)}
                      >
                        <Trash2Icon />
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        disabled={openingId !== null}
                        onClick={() => void restore(run)}
                      >
                        {openingId === run.id ? <Loader2Icon className="animate-spin" /> : null}
                        Open
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        title="Delete measurement run?"
        description="This removes the saved images and results from history."
        confirmLabel="Delete"
        destructive
        open={Boolean(deleting)}
        pending={deletePending}
        onOpenChange={(next) => {
          if (!next) setDeleting(null)
        }}
        onConfirm={() => void remove()}
      />
    </>
  )
}
