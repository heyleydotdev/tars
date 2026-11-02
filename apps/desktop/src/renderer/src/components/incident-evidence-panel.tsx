import type { ComponentProps, ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FileTextIcon,
  ImageIcon,
  ImageOffIcon,
  InfoIcon,
  ListTreeIcon,
  Maximize2Icon,
  MessageSquareIcon,
  MicIcon,
  MicOffIcon,
  PaperclipIcon,
  SendIcon,
  TerminalIcon,
  Trash2Icon
} from 'lucide-react'

import type { IncidentDetailOutput, IncidentEvidenceOutput } from '@tars/core/schemas/incident'
import { INCIDENT_EVIDENCE_CHARS, VOICE_CAPTURE_SETTINGS } from '@tars/core/constants'
import { ERRORS } from '@tars/core/errors'
import { formatTime, toDateKey } from '@tars/core/utils/format'
import { isGuessedTime } from '@tars/core/utils/incident'
import { capitalize } from '@tars/core/utils/string'
import { Button } from '@tars/ui/components/button'
import { ButtonGroup } from '@tars/ui/components/button-group'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@tars/ui/components/context-menu'
import { Spinner } from '@tars/ui/components/spinner'
import { Textarea } from '@tars/ui/components/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@tars/ui/components/tooltip'
import { cn } from '@tars/ui/lib/utils'

import { fileSrc } from '../lib/files'
import {
  useAddIncidentEvidence,
  useAddIncidentScreenshot,
  useIncidentImageUrl,
  useRebuildIncidentTimeline,
  useRemoveIncidentEvidence
} from '../lib/incident'
import { dataUrlToBlob, prepareMeasureImage } from '../lib/measure'
import { recordSegment, toWav } from '../lib/voice'
import { useShellAlertStore } from '../stores/alert'
import ConfirmDialog from './confirm-dialog'
import ConsoleDayHeader from './console-day-header'
import IncidentEvidenceDialog from './incident-evidence-dialog'
import IncidentEvidenceViewer from './incident-evidence-viewer'

function kindIcon(kind: IncidentEvidenceOutput['kind']) {
  if (kind === 'screenshot') return <ImageIcon />
  if (kind === 'log') return <TerminalIcon />
  if (kind === 'voice') return <MicIcon />
  if (kind === 'answer') return <MessageSquareIcon />

  return <FileTextIcon />
}

function TooltipButton({
  label,
  children,
  ...props
}: ComponentProps<typeof Button> & { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button {...props} />}>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function isReceivedAnswer(item: IncidentEvidenceOutput): boolean {
  return item.kind === 'answer' && !item.occurredAt
}

function groupEvidenceByDay(
  evidence: Array<IncidentEvidenceOutput>
): Array<{ key: string; label: string; items: Array<IncidentEvidenceOutput> }> {
  const sorted = [...evidence].sort((left, right) => {
    const leftAt = left.occurredAt ? Date.parse(left.occurredAt) : Number.POSITIVE_INFINITY
    const rightAt = right.occurredAt ? Date.parse(right.occurredAt) : Number.POSITIVE_INFINITY

    return leftAt - rightAt || left.createdAt.localeCompare(right.createdAt)
  })
  const groups: Array<{ key: string; label: string; items: Array<IncidentEvidenceOutput> }> = []

  for (const item of sorted) {
    const key = item.occurredAt
      ? toDateKey(item.occurredAt)
      : isReceivedAnswer(item)
        ? 'received'
        : 'undated'
    const last = groups[groups.length - 1]

    if (last?.key === key) {
      last.items.push(item)
      continue
    }

    groups.push({ key, label: key, items: [item] })
  }

  return groups
}

function EvidenceThumb({ evidenceId }: { evidenceId: string }) {
  const image = useIncidentImageUrl(evidenceId)
  const [failed, setFailed] = useState(false)
  const src = image.data ? fileSrc(image.data.url) : null

  return (
    <div className="bg-muted/30 flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden border">
      {src && !failed ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : image.isPending ? (
        <Spinner className="size-3.5" />
      ) : (
        <ImageOffIcon className="size-4" />
      )}
    </div>
  )
}

export default function IncidentEvidencePanel({
  detail,
  selectedId,
  onSelect,
  onPendingChange
}: {
  detail: IncidentDetailOutput
  selectedId: string | null
  onSelect: (id: string) => void
  onPendingChange?: (pending: boolean) => void
}) {
  const incidentId = detail.incident.id
  const [content, setContent] = useState('')
  const [kind, setKind] = useState<'log' | 'text'>('log')
  const [busy, setBusy] = useState(false)
  const [recording, setRecording] = useState(false)
  const [viewing, setViewing] = useState<IncidentEvidenceOutput | null>(null)
  const [detailsId, setDetailsId] = useState<string | null>(null)
  const [removing, setRemoving] = useState<IncidentEvidenceOutput | null>(null)
  const groups = useMemo(() => groupEvidenceByDay(detail.evidence), [detail.evidence])
  const details = detailsId ? (detail.evidence.find((item) => item.id === detailsId) ?? null) : null
  const fileRef = useRef<HTMLInputElement>(null)
  const add = useAddIncidentEvidence()
  const addScreenshot = useAddIncidentScreenshot()
  const rebuild = useRebuildIncidentTimeline()
  const remove = useRemoveIncidentEvidence()
  const showAlert = useShellAlertStore((state) => state.showAlert)
  const pending = busy || recording || add.isPending || addScreenshot.isPending || remove.isPending

  useEffect(() => {
    onPendingChange?.(pending)
  }, [onPendingChange, pending])

  useEffect(() => () => onPendingChange?.(false), [onPendingChange])

  async function refreshTimeline(): Promise<void> {
    await rebuild.mutateAsync({ incidentId }).catch(() => undefined)
  }

  async function submitContent(): Promise<void> {
    const value = content.trim()

    if (!value || busy) return

    setBusy(true)

    try {
      await add.mutateAsync({ incidentId, kind, content: value })
      setContent('')
      await refreshTimeline()
    } catch {
      showAlert({
        title: ERRORS.saveFailedTitle,
        description: ERRORS.incidentExtractionFailed,
        variant: 'destructive'
      })
    } finally {
      setBusy(false)
    }
  }

  async function submitFiles(files: Array<File>): Promise<void> {
    if (files.length === 0 || busy) return

    setBusy(true)

    try {
      for (const file of files) {
        const photo = await prepareMeasureImage(file)

        await addScreenshot.mutateAsync({
          incidentId,
          image: dataUrlToBlob(photo.dataUrl)
        })
      }

      await refreshTimeline()
    } catch {
      showAlert({
        title: ERRORS.saveFailedTitle,
        description: ERRORS.incidentExtractionFailed,
        variant: 'destructive'
      })
    } finally {
      setBusy(false)
    }
  }

  async function recordVoice(): Promise<void> {
    if (recording || busy) return

    setRecording(true)

    try {
      if (!(await window.requestMicrophoneAccess())) {
        showAlert({
          title: ERRORS.microphoneAccessTitle,
          description: ERRORS.microphoneAccessDenied,
          variant: 'destructive'
        })
        return
      }

      let stream: MediaStream

      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: VOICE_CAPTURE_SETTINGS })
      } catch {
        showAlert({
          title: ERRORS.microphoneAccessTitle,
          description: ERRORS.microphoneAccessDenied,
          variant: 'destructive'
        })
        return
      }

      try {
        const segment = await recordSegment(stream)
        const wav = await toWav(segment)

        if (!wav.hasSpeech) {
          showAlert({
            title: ERRORS.voiceUnavailableTitle,
            description: ERRORS.voiceNoSpeech
          })
          return
        }

        const transcript = await window.transcribeAudio(wav.audio)

        if (!transcript) {
          showAlert({
            title: ERRORS.voiceUnavailableTitle,
            description: ERRORS.transcriptionUnavailable,
            variant: 'destructive'
          })
          return
        }

        await add.mutateAsync({ incidentId, kind: 'voice', content: transcript })
        await refreshTimeline()
      } catch (error) {
        console.error('Voice note failed', error)
        showAlert({
          title: ERRORS.voiceUnavailableTitle,
          description: ERRORS.transcriptionUnavailable,
          variant: 'destructive'
        })
      } finally {
        for (const track of stream.getTracks()) track.stop()
      }
    } finally {
      setRecording(false)
    }
  }

  async function confirmRemove(): Promise<void> {
    if (!removing) return

    try {
      await remove.mutateAsync({ evidenceId: removing.id })
      setRemoving(null)
    } catch {
      setRemoving(null)
      showAlert({
        title: ERRORS.deleteFailed,
        description: ERRORS.incidentEvidenceDeleteFailed,
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="flex flex-col">
      <div className="space-y-2 p-3">
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Paste a log excerpt or describe what you saw…"
          className="min-h-24 text-xs/6"
          maxLength={INCIDENT_EVIDENCE_CHARS}
          disabled={busy || recording}
        />
        <div className="flex flex-wrap items-center gap-2">
          <ButtonGroup>
            <TooltipButton
              type="button"
              size="icon-sm"
              variant="outline"
              label="Add screenshot"
              aria-label="Add screenshot"
              disabled={busy || recording}
              onClick={() => fileRef.current?.click()}
            >
              <PaperclipIcon />
            </TooltipButton>
            <TooltipButton
              type="button"
              size="icon-sm"
              variant="outline"
              label={recording ? 'Stop recording' : 'Record voice note'}
              aria-label="Record voice note"
              disabled={busy || recording}
              onClick={() => void recordVoice()}
            >
              {recording ? <MicIcon className="animate-pulse" /> : <MicOffIcon />}
            </TooltipButton>
          </ButtonGroup>
          <ButtonGroup>
            <TooltipButton
              type="button"
              size="sm"
              variant={kind === 'log' ? 'default' : 'outline'}
              label="Log"
              onClick={() => setKind('log')}
              disabled={busy}
            >
              Log
            </TooltipButton>
            <TooltipButton
              type="button"
              size="sm"
              variant={kind === 'text' ? 'default' : 'outline'}
              label="Note"
              onClick={() => setKind('text')}
              disabled={busy}
            >
              Note
            </TooltipButton>
          </ButtonGroup>
          <ButtonGroup className="ml-auto">
            <TooltipButton
              type="button"
              size="sm"
              label="Add evidence"
              disabled={busy || recording || content.trim().length === 0}
              onClick={() => void submitContent()}
            >
              {busy ? <Spinner className="size-3.5" /> : <SendIcon />}
              Add
            </TooltipButton>
          </ButtonGroup>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = [...(event.target.files ?? [])]
            event.target.value = ''
            void submitFiles(files)
          }}
        />
      </div>

      {groups.length === 0 ? (
        <p className="text-muted-foreground p-3 text-xs/6">
          Nothing yet. Add screenshots, log lines, or a voice note as they come in.
        </p>
      ) : (
        <div className="border-border border-t">
          {groups.map((group) => (
            <section key={group.key}>
              <ConsoleDayHeader label={group.label} count={group.items.length} unit="item" />
              <ul className="divide-border divide-y">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <ContextMenu>
                      <ContextMenuTrigger
                        render={
                          <div
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 transition-colors',
                              item.id === selectedId ? 'bg-muted/40' : 'hover:bg-muted'
                            )}
                          />
                        }
                      >
                        {item.hasImage ? (
                          <button
                            type="button"
                            aria-label={`Enlarge ${item.kind} evidence`}
                            onClick={() => setViewing(item)}
                            className="group relative h-11 w-11 shrink-0 overflow-hidden border"
                          >
                            <EvidenceThumb evidenceId={item.id} />
                            <span className="absolute inset-0 grid place-items-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                              <Maximize2Icon className="size-4" />
                            </span>
                          </button>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <button
                                  type="button"
                                  aria-label={`Select ${item.kind} evidence`}
                                  onClick={() => onSelect(item.id)}
                                  className="bg-muted/30 text-muted-foreground flex h-11 w-11 shrink-0 items-center justify-center border [&_svg]:size-4"
                                />
                              }
                            >
                              {kindIcon(item.kind)}
                            </TooltipTrigger>
                            <TooltipContent>{capitalize(item.kind)}</TooltipContent>
                          </Tooltip>
                        )}
                        <button
                          type="button"
                          onClick={() => onSelect(item.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-muted-foreground font-mono text-xs/6">
                              {item.occurredAt
                                ? formatTime(item.occurredAt)
                                : isReceivedAnswer(item)
                                  ? formatTime(item.createdAt)
                                  : 'Undated'}
                            </span>
                            {isGuessedTime(item.timeSource) ? (
                              <span className="ml-auto font-mono text-xs/6 text-amber-300/80 uppercase">
                                guessed
                              </span>
                            ) : null}
                          </span>
                          <span className="text-foreground mt-0.5 line-clamp-1 text-xs/6">
                            {item.summary ?? item.content ?? 'Screenshot'}
                          </span>
                          {item.status === 'pending' ? (
                            <span className="text-muted-foreground mt-1 flex items-center gap-1 text-xs/6">
                              <Spinner className="size-3" /> Reading…
                            </span>
                          ) : null}
                          {item.status === 'error' ? (
                            <span className="text-destructive mt-1 block text-xs/6">
                              {item.error ?? ERRORS.incidentExtractionFailed}
                            </span>
                          ) : null}
                        </button>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => setDetailsId(item.id)}>
                          <InfoIcon />
                          Details
                        </ContextMenuItem>
                        {item.hasImage ? (
                          <ContextMenuItem onClick={() => setViewing(item)}>
                            <Maximize2Icon />
                            Enlarge
                          </ContextMenuItem>
                        ) : null}
                        <ContextMenuItem onClick={() => onSelect(item.id)}>
                          <ListTreeIcon />
                          Show in timeline
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          variant="destructive"
                          disabled={busy}
                          onClick={() => setRemoving(item)}
                        >
                          <Trash2Icon />
                          Remove
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <ConfirmDialog
        title="Remove evidence?"
        description="This removes the evidence and any timeline entries that only cite it."
        confirmLabel="Remove"
        destructive
        open={removing !== null}
        pending={remove.isPending}
        onOpenChange={(open) => {
          if (!open) setRemoving(null)
        }}
        onConfirm={() => void confirmRemove()}
      />

      <IncidentEvidenceDialog
        evidence={details}
        open={details !== null}
        onOpenChange={(open) => {
          if (!open) setDetailsId(null)
        }}
        onEnlarge={() => {
          const item = details

          setDetailsId(null)

          if (item) setViewing(item)
        }}
      />

      <IncidentEvidenceViewer
        evidence={viewing}
        open={viewing !== null}
        onClose={() => setViewing(null)}
      />
    </div>
  )
}
