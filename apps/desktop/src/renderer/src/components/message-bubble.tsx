import { useState } from 'react'
import { BugIcon, CheckIcon, CopyIcon } from 'lucide-react'

import type { ChatMessage } from '@tars/core/schemas/chat'
import { Bubble, BubbleContent } from '@tars/ui/components/bubble'
import { Button } from '@tars/ui/components/button'
import { Markdown } from '@tars/ui/components/markdown'
import { Message, MessageContent, MessageFooter } from '@tars/ui/components/message'
import { Tooltip, TooltipContent, TooltipTrigger } from '@tars/ui/components/tooltip'

import { useCopyToClipboard } from '../hooks/use-copy-to-clipboard'
import { deskResultMarkdown } from '../lib/desk'
import MessageDebugDialog from './message-debug-dialog'

export type ChatMessageView = ChatMessage & { variant?: 'error' }

function MessageAction({
  label,
  onClick,
  children
}: React.PropsWithChildren<{ label: string; onClick: () => void }>) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  )
}

export default function MessageBubble({ message }: { message: ChatMessageView }) {
  const [debugOpen, setDebugOpen] = useState(false)
  const { copied, copy } = useCopyToClipboard()
  const isUser = message.role === 'user'
  const isError = message.variant === 'error' || message.status === 'error'
  const isThinking = message.status === 'thinking' && message.content === ''
  const content =
    !isUser && message.records.length > 0
      ? deskResultMarkdown(message.content, message.records)
      : message.content

  if (isUser) {
    return (
      <Message align="end">
        <MessageContent className="gap-2">
          <Bubble align="end" variant="muted">
            <BubbleContent>{message.content}</BubbleContent>
          </Bubble>
          <MessageFooter>
            <MessageAction
              label={copied ? 'Copied' : 'Copy message'}
              onClick={() => void copy(message.content)}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </MessageAction>
          </MessageFooter>
        </MessageContent>
      </Message>
    )
  }

  return (
    <>
      <Message>
        <MessageContent className="gap-2">
          {isThinking ? (
            <p className="text-muted-foreground animate-pulse text-sm">Thinking…</p>
          ) : isError ? (
            <p className="text-destructive text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <Markdown>{content}</Markdown>
          )}
          {!isThinking ? (
            <MessageFooter className="gap-1 px-0">
              <MessageAction
                label={copied ? 'Copied' : 'Copy message'}
                onClick={() => void copy(content)}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
              </MessageAction>
              <MessageAction label="Debug message" onClick={() => setDebugOpen(true)}>
                <BugIcon />
              </MessageAction>
            </MessageFooter>
          ) : null}
        </MessageContent>
      </Message>
      {!isThinking ? (
        <MessageDebugDialog
          messageId={message.id}
          status={message.status}
          open={debugOpen}
          onOpenChange={setDebugOpen}
        />
      ) : null}
    </>
  )
}
