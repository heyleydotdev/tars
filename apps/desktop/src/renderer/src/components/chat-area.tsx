import { useEffect } from 'react'

import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport
} from '@tars/ui/components/message-scroller'

import { useChatMessages } from '../lib/chat'
import { useShellAlertStore } from '../stores/alert'
import LoadingScreen from './loading-screen'
import MessageBubble from './message-bubble'
import SayHello from './say-hello'

export default function ChatArea() {
  const { data: messages = [], isError, isPending } = useChatMessages()
  const showAlert = useShellAlertStore((state) => state.showAlert)

  useEffect(() => {
    if (!isError) return

    showAlert({
      title: 'Chat unavailable',
      description:
        messages.length > 0
          ? 'Showing the last loaded conversation.'
          : 'Could not load your conversation. Try again.',
      variant: 'destructive'
    })
  }, [isError, messages.length, showAlert])

  if (isPending) {
    return <LoadingScreen />
  }

  if (messages.length === 0) {
    return <SayHello />
  }

  return (
    <MessageScrollerProvider autoScroll>
      <MessageScroller className="min-h-0 flex-1">
        <MessageScrollerViewport>
          <MessageScrollerContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6">
            {messages.map((message) => (
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
