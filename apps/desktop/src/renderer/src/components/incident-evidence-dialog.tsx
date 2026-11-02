import { Maximize2Icon } from 'lucide-react'

import type { IncidentEvidenceOutput } from '@tars/core/schemas/incident'
import { formatDateTime } from '@tars/core/utils/format'
import { titleCase } from '@tars/core/utils/string'
import { Button } from '@tars/ui/components/button'
import { CodeBlock, CodeBlockContent } from '@tars/ui/components/code-block'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@tars/ui/components/dialog'

export default function IncidentEvidenceDialog({
  evidence,
  open,
  onOpenChange,
  onEnlarge
}: {
  evidence: IncidentEvidenceOutput | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEnlarge: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {evidence ? `${titleCase(evidence.kind)} evidence` : 'Evidence'}
          </DialogTitle>
          <DialogDescription>What the agent read from this evidence.</DialogDescription>
        </DialogHeader>

        {evidence ? (
          <div className="space-y-3">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs/6">
              <dt className="text-muted-foreground">Time</dt>
              <dd>
                {evidence.occurredAt ? (
                  <span className="font-mono tabular-nums">
                    {formatDateTime(evidence.occurredAt)}
                  </span>
                ) : (
                  'No time'
                )}
                {evidence.timeSource ? (
                  <span className="text-muted-foreground">
                    {' · '}
                    <span className="font-mono uppercase">{evidence.timeSource}</span>
                  </span>
                ) : null}
              </dd>
              <dt className="text-muted-foreground">Source</dt>
              <dd>{evidence.source === 'user' ? 'Provided by you' : 'Uploaded'}</dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <span className="font-mono uppercase">{evidence.status}</span>
                {evidence.error ? (
                  <span className="text-destructive"> · {evidence.error}</span>
                ) : null}
              </dd>
            </dl>

            {evidence.summary ? <p className="text-xs/6">{evidence.summary}</p> : null}

            {evidence.content ? (
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs/6">Raw</p>
                <CodeBlock size="sm">
                  <CodeBlockContent wrap className="max-h-64">
                    {evidence.content}
                  </CodeBlockContent>
                </CodeBlock>
              </div>
            ) : null}

            {evidence.hasImage ? (
              <Button type="button" size="xs" variant="outline" onClick={onEnlarge}>
                <Maximize2Icon />
                Open full size
              </Button>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
