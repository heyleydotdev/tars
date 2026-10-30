import { useState } from 'react'
import { ORPCError } from '@orpc/client'

import type { MeasureFormOutput } from '@tars/core/schemas/measure'
import { ERRORS } from '@tars/core/errors'
import { toDateKey } from '@tars/core/utils/format'

import type { MeasureBatchItem, PreparedMeasureImage } from '../lib/measure'
import ConsoleEnd from '../components/console-end'
import ConsoleHeader from '../components/console-header'
import ConsolePanel from '../components/console-panel'
import DashboardShell from '../components/dashboard-shell'
import MeasureBatchResults from '../components/measure-batch-results'
import MeasureForm from '../components/measure-form'
import MeasureGuideButton from '../components/measure-guide-button'
import MeasurePhoto from '../components/measure-photo'
import { useMeasure } from '../lib/measure'

export default function Measure() {
  const [items, setItems] = useState<Array<MeasureBatchItem>>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const measure = useMeasure()
  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null

  function addPhotos(photos: Array<PreparedMeasureImage>): void {
    const additions = photos.map((photo) => ({
      id: crypto.randomUUID(),
      photo,
      status: 'idle' as const,
      result: null,
      error: null
    }))

    setItems((current) => [...current, ...additions])
    setSelectedId(additions[0]?.id ?? null)
  }

  function removePhoto(id: string): void {
    const next = items.filter((item) => item.id !== id)

    setItems(next)

    if (selectedId === id) {
      setSelectedId(next[0]?.id ?? null)
    }
  }

  function resetResults(): void {
    setItems((current) =>
      current.map((item) => ({
        ...item,
        status: 'idle' as const,
        result: null,
        error: null
      }))
    )
  }

  async function measureBatch(values: MeasureFormOutput): Promise<string | null> {
    if (items.length === 0) return ERRORS.photoRequired

    const batch = items
    measure.reset()
    setRunning(true)
    resetResults()

    try {
      for (const item of batch) {
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? { ...entry, status: 'measuring' as const, result: null, error: null }
              : entry
          )
        )

        try {
          const result = await measure.mutateAsync({
            image: item.photo.dataUrl,
            referenceId: values.referenceId,
            prompt: values.prompt
          })

          setItems((current) =>
            current.map((entry) =>
              entry.id === item.id
                ? { ...entry, status: 'done' as const, result, error: null }
                : entry
            )
          )
        } catch (error) {
          setItems((current) =>
            current.map((entry) =>
              entry.id === item.id
                ? {
                    ...entry,
                    status: 'error' as const,
                    result: null,
                    error: error instanceof ORPCError ? error.message : ERRORS.measurementFailed
                  }
                : entry
            )
          )
        }
      }
    } finally {
      setRunning(false)
    }

    return null
  }

  return (
    <DashboardShell>
      <div className="flex min-h-full flex-col">
        <ConsoleHeader
          title="measure"
          right={
            <>
              <span className="text-muted-foreground font-mono tabular-nums">
                {toDateKey(new Date())}
              </span>
              <MeasureGuideButton />
            </>
          }
        />

        <div className="bg-border grid flex-1 grid-cols-1 gap-px lg:grid-cols-12">
          <ConsolePanel
            title="photo.input"
            count={String(items.length)}
            accent="bg-sky-400"
            className="lg:col-span-7"
          >
            <MeasurePhoto
              items={items}
              selectedId={selected?.id ?? null}
              pending={running}
              onSelect={setSelectedId}
              onRemove={removePhoto}
            />
          </ConsolePanel>

          <ConsolePanel
            title="measure.result"
            count={String(items.length)}
            accent="bg-emerald-400"
            className="lg:col-span-5"
          >
            <MeasureBatchResults
              items={items}
              selectedId={selected?.id ?? null}
              onSelect={setSelectedId}
            />
          </ConsolePanel>
        </div>

        <ConsoleEnd />

        <MeasureForm
          photo={items.length > 0}
          pending={running}
          onPhotos={addPhotos}
          onMeasure={measureBatch}
          onChange={resetResults}
        />
      </div>
    </DashboardShell>
  )
}
