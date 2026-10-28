import { BugIcon, CopyIcon } from 'lucide-react'

import { Button } from '@tars/ui/components/button'
import { cn } from '@tars/ui/lib/utils'

import type { ChatMessage } from '../stores/chat'

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap',
          message.variant === 'error'
            ? 'text-destructive'
            : isUser
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted rounded-bl-sm'
        )}
      >
        {message.content}
      </div>
      {message.role === 'assistant' ? (
        <div role="group" aria-label="Message actions" className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Copy message"
            onClick={() => void navigator.clipboard.writeText(message.content)}
          >
            <CopyIcon />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Debug">
            <BugIcon />
          </Button>
        </div>
      ) : null}
    </div>
  )
}
