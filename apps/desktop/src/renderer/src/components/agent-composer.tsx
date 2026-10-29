import { useRef } from 'react'
import { ArrowUpIcon, MicIcon, MicOffIcon } from 'lucide-react'

import { CHAT_MESSAGE_MAX_LENGTH } from '@tars/core/constants'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea
} from '@tars/ui/components/input-group'

import { useSendChatMessage } from '../lib/chat'
import { useComposerStore } from '../stores/composer'
import { isVoicePaused, useVoiceStore } from '../stores/voice'
import DeskSuggestions from './desk-suggestions'

export default function AgentComposer() {
  const formRef = useRef<HTMLFormElement>(null)
  const value = useComposerStore((state) => state.value)
  const setValue = useComposerStore((state) => state.setValue)
  const clear = useComposerStore((state) => state.clear)
  const isPaused = useVoiceStore(isVoicePaused)
  const isTranscribing = useVoiceStore((state) => state.isTranscribing)
  const togglePaused = useVoiceStore((state) => state.togglePaused)
  const pause = useVoiceStore((state) => state.pause)
  const sendMessage = useSendChatMessage()
  const canSend = value.trim() !== '' && !sendMessage.isPending

  const handleSend = (): void => {
    const content = value.trim()

    if (!content || sendMessage.isPending) return

    pause()
    sendMessage.mutate(content)
    clear()
  }

  const handleSuggestion = (suggestion: string): void => {
    if (sendMessage.isPending || isTranscribing) return

    pause()
    sendMessage.mutate(suggestion)
    clear()
  }

  return (
    <div className="bg-sidebar shrink-0 p-3">
      <div className="mx-auto w-full max-w-3xl">
        <DeskSuggestions
          disabled={sendMessage.isPending || isTranscribing}
          onSelect={handleSuggestion}
        />
        <form
          ref={formRef}
          onSubmit={(event) => {
            event.preventDefault()
            handleSend()
          }}
        >
          <InputGroup>
            <InputGroupTextarea
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  formRef.current?.requestSubmit()
                }
              }}
              placeholder={isTranscribing ? 'Transcribing…' : 'Ask TARS anything…'}
              className="max-h-56 min-h-9 p-3"
              rows={1}
              maxLength={CHAT_MESSAGE_MAX_LENGTH}
              aria-label="Message Agent"
              disabled={isTranscribing}
              onPointerDown={() => {
                if (!isPaused) {
                  togglePaused()
                }
              }}
            />
            <InputGroupAddon align="block-end">
              <InputGroupButton
                type="button"
                size="icon-sm"
                variant="outline"
                className={
                  isPaused
                    ? 'text-muted-foreground'
                    : 'text-foreground after:bg-primary/50 relative after:absolute after:inset-0 after:animate-pulse'
                }
                aria-pressed={isPaused}
                aria-label={isPaused ? 'Resume voice commands' : 'Pause voice commands'}
                onClick={togglePaused}
              >
                {isPaused ? <MicOffIcon /> : <MicIcon />}
              </InputGroupButton>
              <InputGroupButton
                type="submit"
                size="icon-sm"
                variant="default"
                className="ml-auto"
                aria-label="Send message"
                disabled={!canSend}
              >
                <ArrowUpIcon />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </form>
      </div>
    </div>
  )
}
