import { useEffect, useState } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Rotate from 'yet-another-react-lightbox/plugins/rotate'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'

import 'yet-another-react-lightbox/styles.css'

import type { MeasureUnit } from '@tars/core/utils/format'
import { formatLength } from '@tars/core/utils/format'
import { Spinner } from '@tars/ui/components/spinner'

import type { MeasureBatchItem } from '../lib/measure'
import type { MeasureAnnotations } from '../stores/measure-annotations'
import { renderMeasure } from '../lib/measure'

export default function MeasureViewer({
  item,
  open,
  annotations,
  unit,
  onClose
}: {
  item: MeasureBatchItem
  open: boolean
  annotations: MeasureAnnotations
  unit: MeasureUnit
  onClose: () => void
}) {
  const [generated, setGenerated] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !item.result) return

    let cancelled = false
    let objectUrl: string | null = null

    void renderMeasure(item.photo, item.result, annotations, unit, false)
      .then((blob) => {
        if (cancelled) return

        objectUrl = URL.createObjectURL(blob)
        setGenerated(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setGenerated(item.photo.dataUrl)
      })

    return () => {
      cancelled = true

      if (objectUrl) {
        setTimeout(() => URL.revokeObjectURL(objectUrl as string), 600)
      }
    }
  }, [annotations, item, open, unit])

  const src = item.result ? generated : item.photo.dataUrl

  if (open && !src) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/90">
        <Spinner className="text-emerald-400" />
      </div>
    )
  }

  const result = item.result
  const description = result
    ? result.objects
        .map(
          (object) =>
            `${object.prompt}: ${formatLength(object.widthMm, unit)} × ${formatLength(object.heightMm, unit)}`
        )
        .join('\n')
    : `${item.photo.width} × ${item.photo.height} px`

  return (
    <Lightbox
      open={open}
      close={onClose}
      slides={
        src
          ? [
              {
                src,
                alt: item.photo.name,
                width: result?.image.width ?? item.photo.width,
                height: result?.image.height ?? item.photo.height,
                title: item.photo.name,
                description
              }
            ]
          : []
      }
      plugins={[Captions, Rotate, Zoom]}
      carousel={{ finite: true, imageFit: 'contain', padding: 24 }}
      controller={{ closeOnBackdropClick: true }}
      zoom={{ maxZoomPixelRatio: 2, scrollToZoom: true }}
      on={{ exited: () => setGenerated(null) }}
      styles={{ container: { backgroundColor: 'rgba(9, 9, 11, 0.96)' } }}
    />
  )
}
