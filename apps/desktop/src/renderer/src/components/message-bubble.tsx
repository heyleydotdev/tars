import { useState } from 'react'
import { BugIcon, CheckIcon, CopyIcon } from 'lucide-react'

import type { ChatMessage } from '@tars/core/schemas/chat'
import { Button } from '@tars/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@tars/ui/components/dialog'
import { cn } from '@tars/ui/lib/utils'

import { useCopyToClipboard } from '../hooks/use-copy-to-clipboard'
import { useMessageThinking } from '../lib/chat'

export type ChatMessageView = ChatMessage & { variant?: 'error' }

function formatContent(content: string): string {
  try {
    return JSON.stringify(JSON.parse(content), null, 2)
  } catch {
    return content
  }
}

export default function MessageBubble({ message }: { message: ChatMessageView }) {
  const [debugOpen, setDebugOpen] = useState(false)
  const { copied, copy } = useCopyToClipboard()
  const thinking = useMessageThinking(message.id, debugOpen && message.role === 'assistant')
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
        <>
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Debug message"
              onClick={() => setDebugOpen(true)}
            >
              <BugIcon />
            </Button>
          </div>
          <Dialog open={debugOpen} onOpenChange={setDebugOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Message debug</DialogTitle>
                <DialogDescription>Status: {message.status}</DialogDescription>
              </DialogHeader>
              <div className="max-h-80 overflow-auto rounded-md border p-3">
                {thinking.isPending ? (
                  <p className="text-muted-foreground text-xs">Loading…</p>
                ) : thinking.data?.length ? (
                  <div className="flex flex-col gap-3">
                    {thinking.data.map((entry) => (
                      <div key={entry.id}>
                        <p className="mb-1 text-xs font-medium capitalize">
                          {entry.kind.replace('_', ' ')}
                        </p>
                        <pre className="text-muted-foreground text-xs whitespace-pre-wrap">
                          {formatContent(entry.content)}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs">No thinking data recorded.</p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  )
}
