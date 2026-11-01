import { useRef } from 'react'
import { ArrowUpIcon, CalendarRangeIcon, MicIcon, MicOffIcon } from 'lucide-react'

import type { SummaryPeriod } from '@tars/core/schemas/chat'
import { CHAT_MESSAGE_MAX_LENGTH } from '@tars/core/constants'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@tars/ui/components/dropdown-menu'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea
} from '@tars/ui/components/input-group'
import { Spinner } from '@tars/ui/components/spinner'

import type { DeskSuggestion } from './desk-suggestions'
import { useSendChatMessage, useSummarize } from '../lib/chat'
import { useComposerStore } from '../stores/composer'
import { isVoicePaused, useVoiceStore } from '../stores/voice'
import DeskSuggestions from './desk-suggestions'

const SUMMARY_PERIODS: Array<{ period: SummaryPeriod; label: string }> = [
  { period: 'day', label: 'Today' },
  { period: 'week', label: 'This week' },
  { period: 'month', label: 'This month' },
  { period: 'year', label: 'This year' }
]

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
  const summarize = useSummarize()
  const busy = sendMessage.isPending || summarize.isPending || isTranscribing
  const canSend = value.trim() !== '' && !busy

  const handleSend = (): void => {
    const content = value.trim()

    if (!content || busy) return

    pause()
    sendMessage.mutate(content)
    clear()
  }

  const handleSuggestion = (suggestion: DeskSuggestion): void => {
    if (busy) return

    pause()

    if (suggestion.period) {
      summarize.mutate(suggestion.period)
      return
    }

    sendMessage.mutate(suggestion.label)
    clear()
  }

  return (
    <div className="bg-sidebar shrink-0 p-3">
      <div className="mx-auto w-full max-w-3xl">
        <DeskSuggestions disabled={busy} onSelect={handleSuggestion} />
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
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={busy}
                  render={
                    <InputGroupButton
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      aria-label="Summarize"
                      disabled={busy}
                    />
                  }
                >
                  {summarize.isPending ? <Spinner /> : <CalendarRangeIcon />}
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start">
                  {SUMMARY_PERIODS.map((item) => (
                    <DropdownMenuItem
                      key={item.period}
                      onClick={() => summarize.mutate(item.period)}
                    >
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
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
