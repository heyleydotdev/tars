import type { ChatMessage, ChatPhaseOutput } from '@tars/core/schemas/chat'
import { parseChatPhase } from '@tars/core/utils/desk'
import { formatDuration, formatJson } from '@tars/core/utils/format'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@tars/ui/components/dialog'

import { useMessageThinking } from '../lib/chat'

function PhaseCard({ phase }: { phase: ChatPhaseOutput }) {
  return (
    <section className="rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium capitalize">{phase.phase}</h3>
        <span className="text-muted-foreground text-[11px]">
          {phase.status ?? 'unknown'} · {formatDuration(phase.durationMs)}
        </span>
      </div>
      {phase.reasoning ? (
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed whitespace-pre-wrap">
          {phase.reasoning}
        </p>
      ) : null}
      <dl className="text-muted-foreground mt-2 grid grid-cols-3 gap-2 text-[11px]">
        <div>
          <dt>Input</dt>
          <dd className="text-foreground">{phase.inputTokens ?? '—'}</dd>
        </div>
        <div>
          <dt>Output</dt>
          <dd className="text-foreground">{phase.outputTokens ?? '—'}</dd>
        </div>
        <div>
          <dt>Reasoning</dt>
          <dd className="text-foreground">{phase.reasoningTokens ?? '—'}</dd>
        </div>
      </dl>
      <p className="text-muted-foreground mt-2 text-[11px]">{phase.model}</p>
    </section>
  )
}

export default function MessageDebugDialog(props: {
  messageId: string
  status: ChatMessage['status']
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { messageId, status, open, onOpenChange } = props
  const thinking = useMessageThinking({ messageId }, open)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Message debug</DialogTitle>
          <DialogDescription>Status: {status}</DialogDescription>
        </DialogHeader>
        <div className="-mx-4 flex max-h-[50vh] flex-col gap-2 overflow-y-auto px-4">
          {thinking.isPending ? (
            <p className="text-muted-foreground text-xs">Loading…</p>
          ) : thinking.data?.length ? (
            thinking.data.map((entry) => {
              const phase = entry.kind === 'observation' ? parseChatPhase(entry.content) : null

              return phase ? (
                <PhaseCard key={entry.id} phase={phase} />
              ) : (
                <div key={entry.id}>
                  <p className="mb-1 text-xs font-medium capitalize">
                    {entry.kind.replace('_', ' ')}
                  </p>
                  <pre className="text-muted-foreground text-xs whitespace-pre-wrap">
                    {formatJson(entry.content)}
                  </pre>
                </div>
              )
            })
          ) : (
            <p className="text-muted-foreground text-xs">No thinking data recorded.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
