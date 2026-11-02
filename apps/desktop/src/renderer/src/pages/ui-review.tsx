import { useRef, useState } from 'react'
import { ImagePlusIcon, ScanEyeIcon, SparklesIcon } from 'lucide-react'

import { UI_REVIEW_VARIANT_LIMIT } from '@tars/core/constants'
import { ERRORS } from '@tars/core/errors'
import { formatDateTime } from '@tars/core/utils/format'
import { Button } from '@tars/ui/components/button'
import { Checkbox } from '@tars/ui/components/checkbox'
import { Input } from '@tars/ui/components/input'
import { Spinner } from '@tars/ui/components/spinner'
import { cn } from '@tars/ui/lib/utils'

import type { ViewerImage } from '../components/image-viewer'
import ConfirmDialog from '../components/confirm-dialog'
import ConsoleHeader from '../components/console-header'
import ConsolePanel from '../components/console-panel'
import ConsoleTabs from '../components/console-tabs'
import EmptyState from '../components/empty-state'
import ImageViewer from '../components/image-viewer'
import PendingNavigationGuard from '../components/pending-navigation-guard'
import { fileSrc } from '../lib/files'
import { dataUrlToBlob, prepareMeasureImage } from '../lib/measure'
import {
  useCreateUiReview,
  useDeleteUiReview,
  useExplainUiReview,
  useGenerateUiRedesign,
  useUiReview,
  useUiReviews,
  useUpdateUiFinding
} from '../lib/ui-review'
import { useShellAlertStore } from '../stores/alert'

const SEVERITY_TONES: Record<string, string> = {
  significant: 'text-destructive',
  moderate: 'text-amber-300',
  minor: 'text-muted-foreground'
}

export default function UiReview() {
  const reviews = useUiReviews()
  const showAlert = useShellAlertStore((state) => state.showAlert)
  const create = useCreateUiReview()
  const explain = useExplainUiReview()
  const generate = useGenerateUiRedesign()
  const updateFinding = useUpdateUiFinding()
  const remove = useDeleteUiReview()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [section, setSection] = useState('findings')
  const [instruction, setInstruction] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [viewing, setViewing] = useState<ViewerImage | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const detail = useUiReview(activeId)
  const data = detail.data ?? null
  const items = reviews.data?.items ?? []
  const latest = data?.variants.at(-1) ?? null
  const busy = uploading || create.isPending || explain.isPending || generate.isPending

  function report(error: unknown): void {
    showAlert({
      title: ERRORS.saveFailedTitle,
      description: error instanceof Error ? error.message : ERRORS.uiExplainFailed,
      variant: 'destructive'
    })
  }

  async function upload(file: File): Promise<void> {
    setUploading(true)

    try {
      const photo = await prepareMeasureImage(file)
      const created = await create.mutateAsync({
        title: file.name,
        image: dataUrlToBlob(photo.dataUrl)
      })

      setActiveId(created.review.id)
      setSection('findings')
    } catch (error) {
      report(error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <ConsoleHeader
        title="ui.review"
        right={
          <Button type="button" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
            {uploading ? <Spinner className="size-3.5" /> : <ImagePlusIcon />}
            New screenshot
          </Button>
        }
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]

            event.target.value = ''

            if (file) void upload(file)
          }}
        />
      </ConsoleHeader>

      <div className="bg-border grid flex-1 grid-cols-1 gap-px lg:min-h-0 lg:grid-cols-12">
        <ConsolePanel
          title="ui.reviews"
          count={String(items.length)}
          accent="bg-sky-400"
          className="lg:col-span-3"
          footer={
            data ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={remove.isPending}
                onClick={() => setDeleting(true)}
              >
                Delete review
              </Button>
            ) : null
          }
        >
          {reviews.isPending ? (
            <div className="text-muted-foreground flex items-center gap-2 p-4 text-xs">
              <Spinner className="size-3.5" />
              Loading…
            </div>
          ) : items.length === 0 ? (
            <EmptyState title="No Reviews" hint="Upload a screenshot to critique it." />
          ) : (
            <ul className="divide-border divide-y">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(item.id)
                      setSection('findings')
                    }}
                    className={cn(
                      'hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-left transition-colors',
                      item.id === activeId ? 'bg-muted/40' : ''
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="text-foreground block truncate text-xs/6 font-medium">
                        {item.title ?? 'Screenshot'}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs/6">
                        {formatDateTime(item.updatedAt)}
                      </span>
                    </span>
                    <span className="font-mono text-xs uppercase">{item.status}</span>
                    <span className="text-muted-foreground text-right font-mono text-xs tabular-nums">
                      {item.findingCount}/{item.variantCount}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ConsolePanel>

        <div className="flex flex-col lg:col-span-9 lg:min-h-0">
          {data ? (
            <ConsoleTabs
              value={section}
              onValueChange={setSection}
              items={[
                { value: 'findings', label: 'Findings', count: data.findings.length },
                {
                  value: 'redesign',
                  label: 'Redesign',
                  count: `${data.variants.length}/${UI_REVIEW_VARIANT_LIMIT}`
                }
              ]}
            />
          ) : null}

          {!data ? (
            <ConsolePanel title="ui.screen" count="0" accent="bg-emerald-400" className="flex-1">
              <EmptyState
                title="No Screen Selected"
                hint="Upload a screenshot, or pick a review on the left."
              />
            </ConsolePanel>
          ) : section === 'findings' ? (
            <ConsolePanel
              title="ui.findings"
              count={String(data.findings.length)}
              accent="bg-emerald-400"
              className="flex-1"
            >
              <div className="grid gap-3 p-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="space-y-3">
                  <button
                    type="button"
                    aria-label="Enlarge reviewed screen"
                    className="block w-full cursor-zoom-in"
                    onClick={() =>
                      setViewing({ src: fileSrc(data.screenshotUrl), title: 'Reviewed screen' })
                    }
                  >
                    <img
                      src={fileSrc(data.screenshotUrl)}
                      alt="Reviewed screen"
                      className="border-border max-h-72 w-full border object-contain"
                    />
                  </button>
                  <p className="text-muted-foreground text-xs/6">
                    {data.review.summary ?? 'Not explained yet.'}
                  </p>
                  {data.review.status === 'created' ? (
                    <Button
                      type="button"
                      size="sm"
                      className="w-full"
                      disabled={busy}
                      onClick={() =>
                        void explain
                          .mutateAsync({ reviewId: data.review.id })
                          .then(() => setSection('findings'))
                          .catch(report)
                      }
                    >
                      {explain.isPending ? <Spinner className="size-3.5" /> : <ScanEyeIcon />}
                      Explain screen
                    </Button>
                  ) : null}
                </div>

                <div>
                  <p className="text-muted-foreground mb-2 font-mono text-xs uppercase">
                    Included in redesign
                  </p>
                  {data.findings.length === 0 ? (
                    <EmptyState
                      title="No Findings Yet"
                      hint="Explain the screen to get visible UI and UX issues."
                    />
                  ) : (
                    <ul className="divide-border divide-y">
                      {data.findings.map((finding) => (
                        <li key={finding.id} className="flex items-start gap-2 py-2 first:pt-0">
                          <Checkbox
                            checked={finding.included}
                            disabled={busy}
                            onCheckedChange={(checked) =>
                              updateFinding.mutate({
                                findingId: finding.id,
                                included: checked === true
                              })
                            }
                          />
                          <span className="min-w-0 flex-1 text-xs/6">
                            <span className="flex items-center gap-2">
                              <span className="text-foreground font-medium">{finding.label}</span>
                              <span
                                className={cn(
                                  'font-mono text-xs uppercase',
                                  SEVERITY_TONES[finding.severity]
                                )}
                              >
                                {finding.severity}
                              </span>
                            </span>
                            <span className="text-muted-foreground block">
                              {finding.description}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </ConsolePanel>
          ) : (
            <ConsolePanel
              title="ui.redesign"
              count={`${data.variants.length}/${UI_REVIEW_VARIANT_LIMIT}`}
              accent="bg-violet-400"
              className="flex-1"
            >
              <div className="space-y-3 p-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={instruction}
                    onChange={(event) => setInstruction(event.target.value)}
                    placeholder="Style request, e.g. more minimal, darker theme"
                    className="h-8 min-w-0 flex-1 text-xs/6"
                    maxLength={300}
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      busy ||
                      data.variants.length >= UI_REVIEW_VARIANT_LIMIT ||
                      data.review.status !== 'explained' ||
                      !data.findings.some((finding) => finding.included)
                    }
                    onClick={() =>
                      void generate
                        .mutateAsync({
                          reviewId: data.review.id,
                          instruction: instruction.trim() || null
                        })
                        .then(() => setInstruction(''))
                        .catch(report)
                    }
                  >
                    {generate.isPending ? <Spinner className="size-3.5" /> : <SparklesIcon />}
                    Generate
                  </Button>
                </div>

                {latest ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <figure className="space-y-1">
                        <button
                          type="button"
                          aria-label="Enlarge original screen"
                          className="block w-full cursor-zoom-in"
                          onClick={() =>
                            setViewing({
                              src: fileSrc(data.screenshotUrl),
                              title: 'Original screen'
                            })
                          }
                        >
                          <img
                            src={fileSrc(data.screenshotUrl)}
                            alt="Original screen"
                            className="border-border h-40 w-full border object-contain"
                          />
                        </button>
                        <figcaption className="text-muted-foreground text-xs">Original</figcaption>
                      </figure>
                      <figure className="space-y-1">
                        <button
                          type="button"
                          aria-label="Enlarge generated redesign"
                          className="block w-full cursor-zoom-in"
                          onClick={() =>
                            setViewing({
                              src: fileSrc(latest.imageUrl),
                              title: 'AI-generated concept',
                              description: 'AI-generated concept, not a working UI.'
                            })
                          }
                        >
                          <img
                            src={fileSrc(latest.imageUrl)}
                            alt="Generated redesign concept"
                            className="border-border h-40 w-full border object-contain"
                          />
                        </button>
                        <figcaption className="text-muted-foreground font-mono text-xs uppercase">
                          AI concept
                        </figcaption>
                      </figure>
                    </div>
                    <p className="text-muted-foreground text-xs/6">
                      AI-generated concept, not a working UI. Use it as a visual direction, not a
                      spec.
                    </p>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase">Addressed</p>
                      <p className="text-xs/6">{latest.findings.join(' · ')}</p>
                      {latest.instruction ? (
                        <p className="text-muted-foreground text-xs/6">
                          Style: {latest.instruction}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex gap-2 overflow-x-auto">
                      {data.variants.map((variant, index) => (
                        <button
                          key={variant.id}
                          type="button"
                          aria-label={`Enlarge redesign ${index + 1}`}
                          className={cn(
                            'size-16 shrink-0 cursor-zoom-in border',
                            variant.id === latest.id ? 'border-emerald-400/60' : 'border-border'
                          )}
                          onClick={() =>
                            setViewing({
                              src: fileSrc(variant.imageUrl),
                              title: 'AI-generated concept',
                              description: 'AI-generated concept, not a working UI.'
                            })
                          }
                        >
                          <img
                            src={fileSrc(variant.imageUrl)}
                            alt="Redesign variant"
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-xs/6">
                    Generate a redesign after reviewing the findings. Every result is an AI concept,
                    not a working interface.
                  </p>
                )}
              </div>
            </ConsolePanel>
          )}
        </div>
      </div>

      <ImageViewer image={viewing} onClose={() => setViewing(null)} />

      <PendingNavigationGuard when={busy} />

      <ConfirmDialog
        title="Delete UI review?"
        description="The screenshot and every generated concept will be removed."
        confirmLabel="Delete"
        destructive
        open={deleting}
        pending={remove.isPending}
        onOpenChange={setDeleting}
        onConfirm={() => {
          if (!data) return
          void remove
            .mutateAsync({ reviewId: data.review.id })
            .then(() => {
              setActiveId(null)
              setDeleting(false)
            })
            .catch(report)
        }}
      />
    </div>
  )
}
