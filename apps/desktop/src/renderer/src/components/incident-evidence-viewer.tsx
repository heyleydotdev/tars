import type { IncidentEvidenceOutput } from '@tars/core/schemas/incident'
import { ERRORS } from '@tars/core/errors'
import { formatDateTime } from '@tars/core/utils/format'
import { Button } from '@tars/ui/components/button'
import { Spinner } from '@tars/ui/components/spinner'

import { fileSrc } from '../lib/files'
import { useIncidentImageUrl } from '../lib/incident'
import ImageViewer from './image-viewer'

export default function IncidentEvidenceViewer({
  evidence,
  open,
  onClose
}: {
  evidence: IncidentEvidenceOutput | null
  open: boolean
  onClose: () => void
}) {
  const image = useIncidentImageUrl(open && evidence ? evidence.id : null)
  const src = open && evidence && image.data ? fileSrc(image.data.url) : null
  const failed = open && Boolean(evidence) && image.isError

  if (open && !src && failed) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/90">
        <div className="space-y-3 text-center">
          <p className="text-xs/6">{ERRORS.incidentEvidenceImageFailed}</p>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    )
  }

  if (open && !src) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/90">
        <Spinner className="text-emerald-400" />
      </div>
    )
  }

  return (
    <ImageViewer
      image={
        src
          ? {
              src,
              title: evidence
                ? `${evidence.kind} · ${
                    evidence.occurredAt
                      ? formatDateTime(evidence.occurredAt)
                      : evidence.kind === 'answer'
                        ? `received ${formatDateTime(evidence.createdAt)}`
                        : 'undated'
                  }`
                : 'Evidence',
              description: evidence?.summary ?? evidence?.content ?? ''
            }
          : null
      }
      onClose={onClose}
    />
  )
}
