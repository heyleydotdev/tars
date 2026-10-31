import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { SparklesIcon } from 'lucide-react'

import { ERRORS } from '@tars/core/errors'
import { Button } from '@tars/ui/components/button'
import { Spinner } from '@tars/ui/components/spinner'

import { seedIncidentDemo } from '../lib/incident-demo'
import { orpc } from '../lib/orpc'
import { useShellAlertStore } from '../stores/alert'

export default function IncidentDemoButton({ onDone }: { onDone: (incidentId: string) => void }) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const queryClient = useQueryClient()
  const showAlert = useShellAlertStore((state) => state.showAlert)
  const pending = progress !== null

  async function load(): Promise<void> {
    if (pending) return

    setProgress({ done: 0, total: 0 })

    try {
      const incidentId = await seedIncidentDemo(setProgress)

      onDone(incidentId)
    } catch (error) {
      console.error(error)
      showAlert({
        title: ERRORS.saveFailedTitle,
        description: error instanceof Error ? error.message : ERRORS.incidentExtractionFailed,
        variant: 'destructive'
      })
    } finally {
      setProgress(null)
      void queryClient.invalidateQueries({ queryKey: orpc.incident.list.queryKey() })
    }
  }

  const label =
    progress && progress.total > 0
      ? `(${progress.done}/${progress.total}) Building...`
      : pending
        ? 'Building...'
        : 'Load demo incident'

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => void load()}
    >
      {pending ? <Spinner className="size-3.5" /> : <SparklesIcon />}
      {label}
    </Button>
  )
}
