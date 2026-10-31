import { useQueryClient } from '@tanstack/react-query'
import { SparklesIcon } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'

import { ERRORS } from '@tars/core/errors'
import { Button } from '@tars/ui/components/button'
import { Spinner } from '@tars/ui/components/spinner'

import { useShellAlertStore } from '../stores/alert'
import { useIncidentDemoStore } from '../stores/incident-demo'

export default function IncidentDemoButton() {
  const { running, done, total } = useIncidentDemoStore(
    useShallow((state) => ({
      running: state.running,
      done: state.done,
      total: state.total
    }))
  )
  const start = useIncidentDemoStore((state) => state.start)
  const queryClient = useQueryClient()
  const showAlert = useShellAlertStore((state) => state.showAlert)

  const label = running
    ? total > 0
      ? `(${done}/${total}) Building...`
      : 'Building...'
    : 'Load demo incident'

  async function load(): Promise<void> {
    if (running) return

    try {
      await start(queryClient)
    } catch (error) {
      console.error(error)
      showAlert({
        title: ERRORS.saveFailedTitle,
        description: ERRORS.incidentDemoFailed,
        variant: 'destructive'
      })
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={running}
      onClick={() => void load()}
    >
      {running ? <Spinner className="size-3.5" /> : <SparklesIcon />}
      {label}
    </Button>
  )
}
