import type { ChatMessage, ChatPhaseOutput } from '@tars/core/schemas/chat'
import { parseChatPhase } from '@tars/core/utils/desk'
import { formatDuration, formatJson } from '@tars/core/utils/format'
import { CodeBlock, CodeBlockContent } from '@tars/ui/components/code-block'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@tars/ui/components/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@tars/ui/components/table'

import { useMessageThinking } from '../lib/chat'

function PhaseCard({ phase }: { phase: ChatPhaseOutput }) {
  return (
    <section className="border p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium capitalize">{phase.phase}</h3>
        <span className="text-muted-foreground text-xs">
          {phase.status ?? 'unknown'} · {formatDuration(phase.durationMs)}
        </span>
      </div>
      {phase.reasoning ? (
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed whitespace-pre-wrap">
          {phase.reasoning}
        </p>
      ) : null}
      <Table className="text-muted-foreground mt-2">
        <TableHeader>
          <TableRow>
            <TableHead>Input</TableHead>
            <TableHead>Output</TableHead>
            <TableHead>Reasoning</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="text-foreground">{phase.inputTokens ?? '—'}</TableCell>
            <TableCell className="text-foreground">{phase.outputTokens ?? '—'}</TableCell>
            <TableCell className="text-foreground">{phase.reasoningTokens ?? '—'}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <p className="text-muted-foreground mt-2 text-xs">{phase.model}</p>
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
          ) : thinking.isError ? (
            <p className="text-destructive text-xs">// failed to load debug data</p>
          ) : thinking.data.length ? (
            thinking.data.map((entry) => {
              const phase = entry.kind === 'observation' ? parseChatPhase(entry.content) : null

              return phase ? (
                <PhaseCard key={entry.id} phase={phase} />
              ) : (
                <div key={entry.id}>
                  <p className="mb-1 text-xs font-medium capitalize">
                    {entry.kind.replace('_', ' ')}
                  </p>
                  <CodeBlock size="sm">
                    <CodeBlockContent wrap>{formatJson(entry.content)}</CodeBlockContent>
                  </CodeBlock>
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
