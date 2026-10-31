import { useEffect, useState } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'

import 'yet-another-react-lightbox/plugins/captions.css'
import 'yet-another-react-lightbox/styles.css'

import type { IncidentEvidenceOutput } from '@tars/core/schemas/incident'
import { ERRORS } from '@tars/core/errors'
import { formatDateTime } from '@tars/core/utils/format'
import { Button } from '@tars/ui/components/button'
import { Spinner } from '@tars/ui/components/spinner'

import { loadIncidentEvidenceImage } from '../lib/incident'

const REVOKE_DELAY_MS = 600

export default function IncidentEvidenceViewer({
  evidence,
  open,
  onClose
}: {
  evidence: IncidentEvidenceOutput | null
  open: boolean
  onClose: () => void
}) {
  const [image, setImage] = useState<{ id: string; url: string } | null>(null)
  const [failureId, setFailureId] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !evidence) return

    let active = true
    let objectUrl: string | null = null

    void loadIncidentEvidenceImage(evidence.id)
      .then((value) => {
        if (!active) {
          URL.revokeObjectURL(value)
          return
        }

        objectUrl = value
        setImage({ id: evidence.id, url: value })
      })
      .catch(() => {
        if (active) setFailureId(evidence.id)
      })

    return () => {
      active = false

      if (objectUrl) {
        setTimeout(() => URL.revokeObjectURL(objectUrl as string), REVOKE_DELAY_MS)
      }
    }
  }, [evidence, open])

  const src = open && evidence && image?.id === evidence.id ? image.url : null
  const failed = open && evidence !== null && failureId === evidence.id

  function close(): void {
    setFailureId(null)
    onClose()
  }

  if (open && !src && failed) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/90">
        <div className="space-y-3 text-center">
          <p className="text-xs/6">{ERRORS.incidentEvidenceImageFailed}</p>
          <Button type="button" size="sm" variant="outline" onClick={close}>
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

  const slide = src
    ? [
        {
          src,
          alt: `${evidence?.kind ?? 'evidence'} screenshot`,
          title: evidence
            ? `${evidence.kind} · ${evidence.occurredAt ? formatDateTime(evidence.occurredAt) : 'no time'}`
            : 'Evidence',
          description: evidence?.summary ?? evidence?.content ?? ''
        }
      ]
    : []

  return (
    <Lightbox
      open={open}
      close={close}
      slides={slide}
      plugins={[Captions, Zoom]}
      carousel={{ finite: true, imageFit: 'contain', padding: 24 }}
      controller={{ closeOnBackdropClick: true }}
      zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
      on={{ exited: () => setImage(null) }}
      styles={{
        root: {
          top: 'var(--title-bar-height)',
          bottom: 'auto',
          height: 'calc(100svh - var(--title-bar-height))'
        },
        container: { backgroundColor: 'rgba(9, 9, 11, 0.96)' }
      }}
    />
  )
}
