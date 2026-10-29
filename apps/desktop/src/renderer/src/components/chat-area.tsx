import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport
} from '@tars/ui/components/message-scroller'

import type { ChatMessageView } from './message-bubble'
import { useChatMessages } from '../lib/chat'
import { useVoiceStore } from '../stores/voice'
import MessageBubble from './message-bubble'
import SayHello from './say-hello'

export default function ChatArea() {
  const { data: messages = [] } = useChatMessages()
  const error = useVoiceStore((state) => state.error)

  const items: Array<ChatMessageView> = error
    ? [
        ...messages,
        {
          id: 'voice-error',
          role: 'assistant',
          content: error,
          status: 'error',
          records: [],
          variant: 'error'
        }
      ]
    : messages

  if (items.length === 0) {
    return <SayHello />
  }

  return (
    <MessageScrollerProvider autoScroll>
      <MessageScroller className="min-h-0 flex-1">
        <MessageScrollerViewport>
          <MessageScrollerContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6">
            {items.map((message) => (
              <MessageScrollerItem key={message.id} messageId={message.id}>
                <MessageBubble message={message} />
              </MessageScrollerItem>
            ))}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  )
}
