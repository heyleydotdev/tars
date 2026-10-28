import { useRef } from 'react'
import { MicIcon, MicOffIcon, SendIcon } from 'lucide-react'

import { Button } from '@tars/ui/components/button'
import { Textarea } from '@tars/ui/components/textarea'

import { useWakeWord } from '../lib/voice'

export default function AgentComposer() {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const wake = useWakeWord(() => inputRef.current?.focus())

  return (
    <div className="bg-sidebar flex shrink-0 flex-col gap-2 border-t p-3">
      {wake.state !== 'idle' || wake.lastPhrase || wake.error ? (
        <p
          className={`truncate px-1 text-xs ${
            wake.error ? 'text-destructive' : 'text-muted-foreground'
          }`}
        >
          {wake.error ??
            (wake.state === 'transcribing'
              ? 'Transcribing…'
              : wake.lastPhrase
                ? `Heard: ${wake.lastPhrase}`
                : 'Listening for “Tars”…')}
        </p>
      ) : null}
      <div className="flex items-end gap-2">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-9 border"
          aria-label={wake.state === 'idle' ? 'Start voice commands' : 'Stop voice commands'}
          onClick={() => {
            if (wake.state === 'idle') {
              void wake.start()
            } else {
              wake.stop()
            }
          }}
        >
          {wake.state === 'idle' ? <MicIcon /> : <MicOffIcon />}
        </Button>
        <Textarea
          ref={inputRef}
          placeholder="Message Agent…"
          className="max-h-56 min-h-9 resize-none"
          rows={1}
          aria-label="Message Agent"
        />
        <Button type="button" size="icon" className="size-9 border" aria-label="Send message">
          <SendIcon />
        </Button>
      </div>
    </div>
  )
}
