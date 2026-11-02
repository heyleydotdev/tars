import { useState } from 'react'
import { CopyIcon, ExternalLinkIcon } from 'lucide-react'
import { useNavigate } from 'react-router'

import type { JournalItemOutput } from '@tars/core/schemas/journal'
import { ERRORS } from '@tars/core/errors'
import { activityIncidentId, activityKind } from '@tars/core/utils/journal'
import { Badge } from '@tars/ui/components/badge'
import { ContextMenuItem } from '@tars/ui/components/context-menu'

import { KIND_BADGE_TONES } from '../lib/badge-tones'
import { useShellAlertStore } from '../stores/alert'
import JournalActivityDialog from './journal-activity-dialog'
import JournalRow from './journal-row'

export default function JournalActivityRow({ entry }: { entry: JournalItemOutput }) {
  const type = activityKind(entry.tags)
  const navigate = useNavigate()
  const showAlert = useShellAlertStore((state) => state.showAlert)
  const incidentId = activityIncidentId(entry.id)
  const [open, setOpen] = useState(false)

  function copy(): void {
    const text = entry.title ? `${entry.title}: ${entry.content}` : entry.content

    void window.copyText(text).catch(() => {
      showAlert({
        title: ERRORS.copyFailedTitle,
        description: ERRORS.copyFailedDetail,
        variant: 'destructive'
      })
    })
  }

  return (
    <>
      <JournalRow
        entry={entry}
        onOpen={() => setOpen(true)}
        menu={
          <>
            {incidentId ? (
              <ContextMenuItem onClick={() => navigate(`/incidents/${incidentId}`)}>
                <ExternalLinkIcon />
                Open incident
              </ContextMenuItem>
            ) : null}
            <ContextMenuItem onClick={copy}>
              <CopyIcon />
              Copy
            </ContextMenuItem>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge variant="default" className={KIND_BADGE_TONES[type]}>
            {type}
          </Badge>
          {entry.title ? (
            <span className="text-foreground font-sans text-xs/6 font-medium">{entry.title}</span>
          ) : null}
        </div>
        <p className="text-muted-foreground mt-1 font-sans text-xs/6 wrap-break-word whitespace-pre-line select-text">
          {entry.content}
        </p>
      </JournalRow>
      <JournalActivityDialog entry={entry} open={open} onOpenChange={setOpen} />
    </>
  )
}
