import { useRef, useState } from 'react'
import { CameraIcon } from 'lucide-react'

import type { MeasureResultOutput } from '@tars/core/schemas/measure'
import { ERRORS } from '@tars/core/errors'
import { Button } from '@tars/ui/components/button'
import { Spinner } from '@tars/ui/components/spinner'

import type { PreparedMeasureImage } from '../lib/measure'
import { prepareMeasureImage } from '../lib/measure'
import { FormError } from './form-error'
import MeasureOverlay from './measure-overlay'

export default function MeasurePhoto({
  photo,
  result,
  pending,
  onPhoto
}: {
  photo: PreparedMeasureImage | null
  result: MeasureResultOutput | null
  pending: boolean
  onPhoto: (photo: PreparedMeasureImage | null) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function acceptFile(file: File | undefined): Promise<void> {
    if (!file) return

    setError(null)

    try {
      onPhoto(await prepareMeasureImage(file))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : ERRORS.imageUnreadable)
    }
  }

  return (
    <div className="space-y-3 p-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          void acceptFile(file)
        }}
      />

      <FormError message={error} />

      {photo ? (
        <>
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground font-mono tabular-nums">
              {photo.width}×{photo.height}px
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="xs"
                disabled={pending}
                onClick={() => fileRef.current?.click()}
              >
                Replace
              </Button>
              <Button variant="ghost" size="xs" disabled={pending} onClick={() => onPhoto(null)}>
                Clear
              </Button>
            </div>
          </div>

          <div className="border-border relative border">
            {result ? (
              <MeasureOverlay image={photo.dataUrl} result={result} />
            ) : (
              <img src={photo.dataUrl} alt="Photo to measure" className="block w-full" />
            )}
            {pending ? (
              <div className="bg-background/60 absolute inset-0 flex items-center justify-center">
                <Spinner className="text-amber-300" />
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            void acceptFile(event.dataTransfer.files[0])
          }}
          className="border-border hover:bg-muted/20 focus-visible:ring-ring/50 flex min-h-80 w-full flex-col items-center justify-center gap-3 border border-dashed p-6 text-center transition-colors focus-visible:ring-1 focus-visible:outline-none"
        >
          <CameraIcon className="text-muted-foreground size-6" />
          <span className="text-foreground text-xs">Drop a Top-Down Photo</span>
          <span className="text-muted-foreground text-xs">Click to Browse · Resized to 1600px</span>
        </button>
      )}
    </div>
  )
}
