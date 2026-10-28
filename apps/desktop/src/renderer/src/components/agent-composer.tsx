import { useRef, useState } from 'react'
import { MicIcon, MicOffIcon, SendIcon } from 'lucide-react'

import { Button } from '@tars/ui/components/button'
import { Textarea } from '@tars/ui/components/textarea'

import { useChatStore } from '../stores/chat'
import { useVoiceWake } from './voice-wake-context'

export default function AgentComposer() {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const voice = useVoiceWake()
  const send = useChatStore((state) => state.send)
  const [value, setValue] = useState('')

  const handleSend = (): void => {
    send(value)
    setValue('')
  }

  return (
    <div className="bg-sidebar flex shrink-0 flex-col gap-2 border-t p-3">
      <div className="flex items-end gap-2">
        <Button
          type="button"
          size="icon"
          variant={voice.isPaused ? 'outline' : 'secondary'}
          className={`size-9 border ${voice.isPaused ? 'text-muted-foreground' : 'text-foreground after:bg-primary/50 relative after:absolute after:inset-0 after:animate-pulse after:rounded-[inherit]'}`}
          aria-pressed={voice.isPaused}
          aria-label={voice.isPaused ? 'Resume voice commands' : 'Pause voice commands'}
          onClick={voice.togglePaused}
        >
          {voice.isPaused ? <MicOffIcon /> : <MicIcon />}
        </Button>
        <Textarea
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              handleSend()
            }
          }}
          placeholder={voice.isTranscribing ? 'Transcribing…' : 'Ask TARS anything…'}
          className="max-h-56 min-h-9 resize-none"
          rows={1}
          aria-label="Message Agent"
          disabled={voice.isTranscribing}
          onPointerDown={() => {
            if (!voice.isPaused) {
              voice.togglePaused()
            }
          }}
        />
        <Button
          type="button"
          size="icon"
          className="size-9 border"
          aria-label="Send message"
          disabled={value.trim() === ''}
          onClick={handleSend}
        >
          <SendIcon />
        </Button>
      </div>
    </div>
  )
}
