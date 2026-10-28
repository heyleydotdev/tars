import { useRef } from 'react'
import { MicIcon, MicOffIcon, SendIcon } from 'lucide-react'

import { Button } from '@tars/ui/components/button'
import { Textarea } from '@tars/ui/components/textarea'

import { useSendChatMessage } from '../lib/chat'
import { useComposerStore } from '../stores/composer'
import { isVoicePaused, useVoiceStore } from '../stores/voice'

export default function AgentComposer() {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const value = useComposerStore((state) => state.value)
  const setValue = useComposerStore((state) => state.setValue)
  const clear = useComposerStore((state) => state.clear)
  const isPaused = useVoiceStore(isVoicePaused)
  const isTranscribing = useVoiceStore((state) => state.isTranscribing)
  const togglePaused = useVoiceStore((state) => state.togglePaused)
  const pause = useVoiceStore((state) => state.pause)
  const sendMessage = useSendChatMessage()

  const handleSend = (): void => {
    const content = value.trim()

    if (!content) return

    pause()
    sendMessage.mutate(content)
    clear()
  }

  return (
    <div className="bg-sidebar flex shrink-0 flex-col gap-2 border-t p-3">
      <div className="flex items-end gap-2">
        <Button
          type="button"
          size="icon"
          variant={isPaused ? 'outline' : 'secondary'}
          className={`size-9 border ${isPaused ? 'text-muted-foreground' : 'text-foreground after:bg-primary/50 relative after:absolute after:inset-0 after:animate-pulse after:rounded-[inherit]'}`}
          aria-pressed={isPaused}
          aria-label={isPaused ? 'Resume voice commands' : 'Pause voice commands'}
          onClick={togglePaused}
        >
          {isPaused ? <MicOffIcon /> : <MicIcon />}
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
          placeholder={isTranscribing ? 'Transcribing…' : 'Ask TARS anything…'}
          className="max-h-56 min-h-9 resize-none"
          rows={1}
          aria-label="Message Agent"
          disabled={isTranscribing}
          onPointerDown={() => {
            if (!isPaused) {
              togglePaused()
            }
          }}
        />
        <Button
          type="button"
          size="icon"
          className="size-9 border"
          aria-label="Send message"
          disabled={value.trim() === '' || sendMessage.isPending}
          onClick={handleSend}
        >
          <SendIcon />
        </Button>
      </div>
    </div>
  )
}
