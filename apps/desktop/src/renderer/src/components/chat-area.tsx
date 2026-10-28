import { useEffect, useRef } from 'react'
import { ChevronDownIcon } from 'lucide-react'

import { Button } from '@tars/ui/components/button'

import { useStickToBottom } from '../hooks/use-stick-to-bottom'
import { useChatStore } from '../stores/chat'
import MessageBubble from './message-bubble'
import SayHello from './say-hello'
import { useVoiceWake } from './voice-wake-context'

export default function ChatArea() {
  const messages = useChatStore((state) => state.messages)
  const sendError = useChatStore((state) => state.sendError)
  const voice = useVoiceWake()
  const lastErrorRef = useRef<string | null>(null)
  const { ref, isStuck, scrollToBottom } = useStickToBottom<HTMLDivElement>(messages)

  useEffect(() => {
    if (!voice.error) {
      lastErrorRef.current = null
      return
    }

    if (voice.error !== lastErrorRef.current) {
      lastErrorRef.current = voice.error
      sendError(voice.error)
    }
  }, [voice.error, sendError])

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={ref} className="absolute inset-0 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <SayHello />
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((message) => (
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
