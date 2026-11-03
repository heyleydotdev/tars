import { useRef, useState } from 'react'
import { ImagePlusIcon, Maximize2Icon, ScanEyeIcon, SparklesIcon, Trash2Icon } from 'lucide-react'

import type { UiReviewSummaryOutput } from '@tars/core/schemas/ui-review'
import { ERRORS } from '@tars/core/errors'
import { formatTime } from '@tars/core/utils/format'
import { Badge } from '@tars/ui/components/badge'
import { Button } from '@tars/ui/components/button'
import {
  CodeBlock,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle
} from '@tars/ui/components/code-block'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '@tars/ui/components/context-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@tars/ui/components/dialog'
import { Input } from '@tars/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@tars/ui/components/select'
import { Spinner } from '@tars/ui/components/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@tars/ui/components/tabs'
import { useHighlightedCode } from '@tars/ui/hooks/use-highlighted-code'
import { cn } from '@tars/ui/lib/utils'

import type { ViewerImage } from '../components/image-viewer'
import ConfirmDialog from '../components/confirm-dialog'
import ConsoleHeader from '../components/console-header'
import ConsolePanel from '../components/console-panel'
import ConsoleTabs from '../components/console-tabs'
import EmptyState from '../components/empty-state'
import ImageViewer from '../components/image-viewer'
import PendingNavigationGuard from '../components/pending-navigation-guard'
import { logAction } from '../lib/activity'
import { SEVERITY_BADGE_TONES, UI_REVIEW_STATUS_TONES } from '../lib/badge-tones'
import { fileSrc } from '../lib/files'
import { dataUrlToBlob, prepareMeasureImage } from '../lib/measure'
import { previewDocument } from '../lib/ui-preview'
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

function RedesignCode({ code }: { code: string }) {
  const lines = useHighlightedCode(code, 'html')

  return (
    <CodeBlock>
      <CodeBlockHeader>
        <CodeBlockTitle>index.html</CodeBlockTitle>
        <CodeBlockCopyButton value={code} className="ml-auto" />
      </CodeBlockHeader>
      <CodeBlockContent wrap className="max-h-128">
        {lines.map((line, index) => (
          <CodeBlockLine key={index}>{line}</CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  )
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
  const [deleting, setDeleting] = useState<UiReviewSummaryOutput | null>(null)
  const [viewing, setViewing] = useState<ViewerImage | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [variantId, setVariantId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const detail = useUiReview(activeId)
  const data = detail.data ?? null
  const items = reviews.data?.items ?? []
  const latest = data?.variants.at(-1) ?? null
  const activeVariant = data?.variants.find((variant) => variant.id === variantId) ?? latest
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

      logAction('ui.created', created.review.id, created.review.title ?? 'UI review')
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
        >
          {reviews.isPending ? (
            <div className="text-muted-foreground flex items-center gap-2 p-4 text-xs">
              <Spinner className="size-3.5" />
              Loading…
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title="No Reviews"
              hint="Upload a screenshot to critique it."
              icon={ScanEyeIcon}
            />
          ) : (
            <ul className="divide-border divide-y">
              {items.map((item) => (
                <li key={item.id}>
                  <ContextMenu>
                    <ContextMenuTrigger
                      render={
                        <button
                          type="button"
                          aria-current={item.id === activeId ? 'true' : undefined}
                          onClick={() => {
                            setActiveId(item.id)
                            setSection('findings')
                          }}
                          className={cn(
                            'hover:bg-muted/60 relative flex w-full items-start gap-2 px-3 py-2 text-left transition-colors',
                            item.id === activeId ? 'bg-muted/40' : ''
                          )}
                        >
                          {item.id === activeId ? (
                            <span
                              aria-hidden
                              className="absolute inset-y-0 left-0 w-px bg-emerald-400"
                            />
                          ) : null}
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <Badge
                                variant="default"
                                className={UI_REVIEW_STATUS_TONES[item.status]}
                              >
                                {item.status}
                              </Badge>
                              <span className="text-foreground truncate text-xs/6 font-medium">
                                {item.title ?? 'Screenshot'}
                              </span>
                            </span>
                            <span className="text-muted-foreground mt-0.5 line-clamp-1 text-xs/6">
                              {item.summary ?? 'Not explained yet.'}
                            </span>
                            <span className="text-muted-foreground mt-0.5 block text-xs/6">
                              {item.findingCount} finding{item.findingCount === 1 ? '' : 's'} ·{' '}
                              {item.variantCount} variant{item.variantCount === 1 ? '' : 's'}
                            </span>
                          </span>
                          <span className="text-muted-foreground shrink-0 text-right font-mono text-xs/6 tabular-nums">
                            {formatTime(item.updatedAt)}
                          </span>
                        </button>
                      }
                    />
                    <ContextMenuContent>
                      <ContextMenuItem variant="destructive" onClick={() => setDeleting(item)}>
                        <Trash2Icon />
                        Delete review
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                </li>
              ))}
            </ul>
          )}
        </ConsolePanel>

        <div className="flex flex-col lg:col-span-9 lg:min-h-0">
          {!data ? (
            <ConsolePanel title="ui.screen" count="0" accent="bg-emerald-400" className="flex-1">
              <EmptyState
                title="No Screen Selected"
                hint="Upload a screenshot, or pick a review on the left."
              />
            </ConsolePanel>
          ) : (
            <ConsoleTabs
              value={section}
              onValueChange={setSection}
              items={[
                { value: 'findings', label: 'Findings', count: data.findings.length },
                { value: 'redesign', label: 'Redesign' }
              ]}
            >
              <TabsContent value="findings" keepMounted className="flex flex-1 flex-col lg:min-h-0">
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
                              .then(() => {
                                logAction(
                                  'ui.explained',
                                  data.review.id,
                                  data.review.title ?? 'UI review'
                                )
                                setSection('findings')
                              })
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
                            <li key={finding.id}>
                              <label
                                className={cn(
                                  'hover:bg-muted/40 flex cursor-pointer items-start gap-3 py-2 transition-colors',
                                  finding.included ? '' : 'opacity-60'
                                )}
                              >
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-center gap-2">
                                    <span className="text-foreground text-xs/6 font-medium">
                                      {finding.label}
                                    </span>
                                    <Badge
                                      variant="default"
                                      className={SEVERITY_BADGE_TONES[finding.severity]}
                                    >
                                      {finding.severity}
                                    </Badge>
                                  </span>
                                  <span className="text-muted-foreground mt-0.5 line-clamp-2 block text-xs/6">
                                    {finding.description}
                                  </span>
                                </span>
                                <input
                                  type="checkbox"
                                  checked={finding.included}
                                  disabled={busy}
                                  onChange={(event) =>
                                    updateFinding.mutate(
                                      {
                                        findingId: finding.id,
                                        included: event.target.checked
                                      },
                                      { onError: report }
                                    )
                                  }
                                  aria-label={`Include ${finding.label} in redesign`}
                                  className="mt-1 size-3.5 shrink-0 cursor-pointer accent-emerald-400 disabled:cursor-not-allowed"
                                />
                              </label>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </ConsolePanel>
              </TabsContent>
              <TabsContent value="redesign" keepMounted className="flex flex-1 flex-col lg:min-h-0">
                <ConsolePanel title="ui.redesign" accent="bg-violet-400" className="flex-1">
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
                          data.review.status !== 'explained' ||
                          !data.findings.some((finding) => finding.included)
                        }
                        onClick={() =>
                          void generate
                            .mutateAsync({
                              reviewId: data.review.id,
                              instruction: instruction.trim() || null
                            })
                            .then(() => {
                              logAction(
                                'ui.redesign',
                                data.review.id,
                                data.review.title ?? 'UI review'
                              )
                              setInstruction('')
                              setVariantId(null)
                            })
                            .catch(report)
                        }
                      >
                        {generate.isPending ? <Spinner className="size-3.5" /> : <SparklesIcon />}
                        Generate
                      </Button>
                      {activeVariant?.code ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setExpanded(true)}
                        >
                          <Maximize2Icon />
                          Expand
                        </Button>
                      ) : null}
                    </div>

                    {activeVariant ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs uppercase">Concept</span>
                          <Select
                            value={activeVariant.id}
                            onValueChange={(value) => {
                              if (typeof value === 'string') setVariantId(value)
                            }}
                          >
                            <SelectTrigger className="h-7 w-40 text-xs">
                              <SelectValue>
                                {(value: string) => {
                                  const index = data.variants.findIndex(
                                    (variant) => variant.id === value
                                  )

                                  return index >= 0 ? `Concept ${index + 1}` : 'Concept'
                                }}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {data.variants.map((variant, index) => (
                                <SelectItem key={variant.id} value={variant.id}>
                                  Concept {index + 1}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Tabs defaultValue="preview" className="flex flex-col gap-0">
                          <TabsList
                            variant="line"
                            className="border-border h-8 w-full justify-start gap-0 rounded-none border-b bg-transparent p-0"
                          >
                            {[
                              { value: 'preview', label: 'Preview' },
                              { value: 'code', label: 'Code' }
                            ].map((tab) => (
                              <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="after:bg-foreground flex-none rounded-none border-r px-3 text-xs tracking-wide last:border-r-0"
                              >
                                {tab.label}
                              </TabsTrigger>
                            ))}
                          </TabsList>
                          <TabsContent value="preview" className="pt-2">
                            <figure className="space-y-1">
                              {activeVariant.code ? (
                                <div className="border-border bg-background border p-1">
                                  <iframe
                                    title="AI-generated redesign"
                                    sandbox=""
                                    srcDoc={previewDocument(activeVariant.code)}
                                    className="h-128 w-full bg-white"
                                  />
                                </div>
                              ) : null}
                              <figcaption className="text-muted-foreground font-mono text-xs uppercase">
                                AI concept
                              </figcaption>
                            </figure>
                          </TabsContent>
                          <TabsContent value="code" className="pt-2">
                            <RedesignCode code={activeVariant.code ?? ''} />
                          </TabsContent>
                        </Tabs>
                        <div>
                          <p className="text-muted-foreground text-xs uppercase">Addressed</p>
                          <p className="text-xs/6">{activeVariant.findings.join(' · ')}</p>
                          {activeVariant.instruction ? (
                            <p className="text-muted-foreground text-xs/6">
                              Style: {activeVariant.instruction}
                            </p>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground text-xs/6">
                        Generate a redesign after reviewing the findings. Every result is an AI
                        concept, not a working interface.
                      </p>
                    )}
                  </div>
                </ConsolePanel>
              </TabsContent>
            </ConsoleTabs>
          )}
        </div>
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent
          className="h-[88vh] w-[92vw] max-w-none! gap-0 p-0 sm:max-w-none!"
          showCloseButton
        >
          <DialogHeader className="sr-only">
            <DialogTitle>AI redesign</DialogTitle>
            <DialogDescription>Full-size preview of the generated design.</DialogDescription>
          </DialogHeader>
          {activeVariant?.code ? (
            <iframe
              title="AI-generated redesign, full size"
              sandbox=""
              srcDoc={previewDocument(activeVariant.code)}
              className="size-full border-0 bg-white"
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <ImageViewer image={viewing} onClose={() => setViewing(null)} />

      <PendingNavigationGuard when={busy} />

      <ConfirmDialog
        title="Delete UI review?"
        description="The screenshot and every generated concept will be removed."
        confirmLabel="Delete"
        destructive
        open={deleting !== null}
        pending={remove.isPending}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        onConfirm={() => {
          if (!deleting) return

          const id = deleting.id

          void remove
            .mutateAsync({ reviewId: id })
            .then(() => {
              logAction('ui.deleted', id, deleting.title ?? 'UI review')
              if (id === activeId) setActiveId(null)
              setDeleting(null)
            })
            .catch((error: unknown) => {
              setDeleting(null)
              report(error)
            })
        }}
      />
    </div>
  )
}
