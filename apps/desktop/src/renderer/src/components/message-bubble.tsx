import { BugIcon, CheckIcon, CopyIcon } from 'lucide-react'

import type { ChatMessage } from '@tars/core/schemas/chat'
import { Button } from '@tars/ui/components/button'
import { cn } from '@tars/ui/lib/utils'

import { useCopyToClipboard } from '../hooks/use-copy-to-clipboard'

export type ChatMessageView = ChatMessage & { variant?: 'error' }

export default function MessageBubble({ message }: { message: ChatMessageView }) {
  const { copied, copy } = useCopyToClipboard()
  const isUser = message.role === 'user'
  const isError = message.variant === 'error' || message.status === 'error'
  const isThinking = message.status === 'thinking' && message.content === ''

  return (
    <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap',
          isError
            ? 'text-destructive'
            : isUser
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted rounded-bl-sm'
        )}
      >
        {isThinking ? <span className="text-muted-foreground">Thinking…</span> : message.content}
      </div>
      {message.role === 'assistant' && !isThinking ? (
        <div role="group" aria-label="Message actions" className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={copied ? 'Copied' : 'Copy message'}
            onClick={() => void copy(message.content)}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Debug">
            <BugIcon />
          </Button>
        </div>
      ) : null}
    </div>
  )
}
