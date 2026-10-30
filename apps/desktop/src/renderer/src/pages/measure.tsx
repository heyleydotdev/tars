import { useState } from 'react'
import { ORPCError } from '@orpc/client'

import type { MeasureFormOutput } from '@tars/core/schemas/measure'
import { ERRORS } from '@tars/core/errors'
import { toDateKey } from '@tars/core/utils/format'

import type { PreparedMeasureImage } from '../lib/measure'
import ConsoleEnd from '../components/console-end'
import ConsoleHeader from '../components/console-header'
import ConsolePanel from '../components/console-panel'
import DashboardShell from '../components/dashboard-shell'
import MeasureForm from '../components/measure-form'
import MeasureGuideButton from '../components/measure-guide-button'
import MeasurePhoto from '../components/measure-photo'
import MeasureResult from '../components/measure-result'
import { useMeasure } from '../lib/measure'

export default function Measure() {
  const [photo, setPhoto] = useState<PreparedMeasureImage | null>(null)
  const measure = useMeasure()

  async function measurePhoto(values: MeasureFormOutput): Promise<string | null> {
    if (!photo) return ERRORS.photoRequired

    measure.reset()

    try {
      await measure.mutateAsync({
        image: photo.dataUrl,
        referenceId: values.referenceId,
        prompt: values.prompt
      })
      return null
    } catch (error) {
      return error instanceof ORPCError ? error.message : ERRORS.measurementFailed
    }
  }

  return (
    <DashboardShell>
      <div className="flex min-h-full flex-col">
        <ConsoleHeader
          title="measure"
          right={
            <span className="text-muted-foreground font-mono tabular-nums">
              {toDateKey(new Date())}
            </span>
          }
        />

        <div className="bg-border grid flex-1 grid-cols-1 gap-px lg:grid-cols-12">
          <ConsolePanel
            title="photo.input"
            count={photo ? '1' : '0'}
            accent="bg-sky-400"
            className="lg:col-span-7"
          >
            <MeasurePhoto
              photo={photo}
              result={measure.data ?? null}
              pending={measure.isPending}
              onPhoto={(next) => {
                setPhoto(next)
                measure.reset()
              }}
            />
          </ConsolePanel>

          <ConsolePanel
            title="measure.result"
            count={measure.data ? String(measure.data.objects.length) : '0'}
            accent="bg-emerald-400"
            className="lg:col-span-5"
            actions={<MeasureGuideButton />}
          >
            <div className="space-y-4 p-3">
              <MeasureForm
                photo={Boolean(photo)}
                pending={measure.isPending}
                onMeasure={measurePhoto}
                onChange={() => measure.reset()}
              />
              <MeasureResult result={measure.data ?? null} />
            </div>
          </ConsolePanel>
        </div>
        <ConsoleEnd />
      </div>
    </DashboardShell>
  )
}
