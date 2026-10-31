import type { ComponentProps, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import {
  FileTextIcon,
  ImageIcon,
  MicIcon,
  MicOffIcon,
  PaperclipIcon,
  SendIcon,
  XIcon
} from 'lucide-react'

import type { IncidentDetailOutput, IncidentEvidenceOutput } from '@tars/core/schemas/incident'
import { INCIDENT_EVIDENCE_CHARS, VOICE_CAPTURE_SETTINGS } from '@tars/core/constants'
import { ERRORS } from '@tars/core/errors'
import { formatTime } from '@tars/core/utils/format'
import { isGuessedTime } from '@tars/core/utils/incident'
import { Button } from '@tars/ui/components/button'
import { ButtonGroup } from '@tars/ui/components/button-group'
import { Spinner } from '@tars/ui/components/spinner'
import { Textarea } from '@tars/ui/components/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@tars/ui/components/tooltip'

import {
  loadIncidentEvidenceImage,
  useAddIncidentEvidence,
  useRebuildIncidentTimeline,
  useRemoveIncidentEvidence
} from '../lib/incident'
import { prepareMeasureImage } from '../lib/measure'
import { recordSegment, toWav } from '../lib/voice'
import { useShellAlertStore } from '../stores/alert'

function kindIcon(kind: IncidentEvidenceOutput['kind']) {
  if (kind === 'screenshot') return <ImageIcon />
  if (kind === 'voice') return <MicIcon />
  if (kind === 'answer') return <SendIcon />

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

function EvidenceThumb({ evidenceId }: { evidenceId: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    void loadIncidentEvidenceImage(evidenceId)
      .then((value) => {
        if (active) setUrl(value)
        else URL.revokeObjectURL(value)
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [evidenceId])

  useEffect(() => {
    if (!url) return

    return () => URL.revokeObjectURL(url)
  }, [url])

  return (
    <div className="bg-muted/30 flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden border">
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <Spinner className="size-3.5" />
      )}
    </div>
  )
}

export default function IncidentEvidencePanel({
  detail,
  selectedId,
  onSelect
}: {
  detail: IncidentDetailOutput
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const incidentId = detail.incident.id
  const [content, setContent] = useState('')
  const [kind, setKind] = useState<'log' | 'text'>('log')
  const [busy, setBusy] = useState(false)
  const [recording, setRecording] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const add = useAddIncidentEvidence()
  const rebuild = useRebuildIncidentTimeline()
  const remove = useRemoveIncidentEvidence()
  const showAlert = useShellAlertStore((state) => state.showAlert)

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

        await add.mutateAsync({ incidentId, kind: 'screenshot', image: photo.dataUrl })
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

  async function removeEvidence(id: string): Promise<void> {
    try {
      await remove.mutateAsync({ evidenceId: id })
    } catch {
      showAlert({
        title: ERRORS.deleteFailed,
        description: ERRORS.incidentEvidenceDeleteFailed,
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="space-y-2">
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
              size="icon-xs"
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
              size="icon-xs"
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
              size="xs"
              variant={kind === 'log' ? 'default' : 'outline'}
              label="Log"
              onClick={() => setKind('log')}
              disabled={busy}
            >
              Log
            </TooltipButton>
            <TooltipButton
              type="button"
              size="xs"
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
              size="xs"
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

      {detail.evidence.length === 0 ? (
        <p className="text-muted-foreground text-xs/6">
          Nothing yet. Add screenshots, log lines, or a voice note as they come in.
        </p>
      ) : (
        <ul className="divide-border border-border divide-y border">
          {detail.evidence.map((item) => (
            <li key={item.id}>
              <div
                className={
                  item.id === selectedId
                    ? 'bg-muted/40 flex gap-2 p-2'
                    : 'hover:bg-muted/20 flex gap-2 p-2'
                }
              >
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className="flex min-w-0 flex-1 items-start gap-2 text-left"
                >
                  {item.hasImage ? (
                    <EvidenceThumb evidenceId={item.id} />
                  ) : (
                    <span className="bg-muted/30 text-muted-foreground flex h-11 w-11 shrink-0 items-center justify-center border [&_svg]:size-4">
                      {kindIcon(item.kind)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-muted-foreground font-mono text-xs/6 uppercase">
                        {item.kind}
                      </span>
                      <span className="text-muted-foreground font-mono text-xs/6">
                        {item.occurredAt ? formatTime(item.occurredAt) : 'no time'}
                      </span>
                      {isGuessedTime(item.timeSource) ? (
                        <span className="font-mono text-xs/6 text-amber-300/80">guessed</span>
                      ) : null}
                    </span>
                    <span className="text-foreground/90 mt-0.5 line-clamp-2 block text-xs/6">
                      {item.summary ?? item.content ?? 'Screenshot'}
                    </span>
                    {item.status === 'pending' ? (
                      <span className="text-muted-foreground mt-1 flex items-center gap-1 text-xs/6">
                        <Spinner className="size-3" /> reading…
                      </span>
                    ) : null}
                    {item.status === 'error' ? (
                      <span className="text-destructive mt-1 block text-xs/6">
                        {item.error ?? ERRORS.incidentExtractionFailed}
                      </span>
                    ) : null}
                  </span>
                </button>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Remove ${item.kind} evidence`}
                  disabled={busy}
                  onClick={() => void removeEvidence(item.id)}
                >
                  <XIcon />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
