import { ChevronDownIcon } from 'lucide-react'

import { Button } from '@tars/ui/components/button'

import type { ChatMessageView } from './message-bubble'
import { useStickToBottom } from '../hooks/use-stick-to-bottom'
import { useChatMessages } from '../lib/chat'
import MessageBubble from './message-bubble'
import SayHello from './say-hello'
import { useVoiceWake } from './voice-wake-context'

export default function ChatArea() {
  const { data: messages = [] } = useChatMessages()
  const voice = useVoiceWake()
  const { ref, isStuck, scrollToBottom } = useStickToBottom<HTMLDivElement>(messages)

  const items: Array<ChatMessageView> = voice.error
    ? [
        ...messages,
        {
          id: 'voice-error',
          role: 'assistant',
          content: voice.error,
          status: 'error',
          variant: 'error'
        }
      ]
    : messages

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={ref} className="absolute inset-0 overflow-y-auto p-4">
        {items.length === 0 ? (
          <SayHello />
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </div>
        )}
      </div>
      {!isStuck ? (
        <Button
          type="button"
          size="icon"
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border shadow"
          aria-label="Jump to latest message"
          onClick={scrollToBottom}
        >
          <ChevronDownIcon />
        </Button>
      ) : null}
    </div>
  )
}
