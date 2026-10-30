import { TriangleAlertIcon, XIcon } from 'lucide-react'

import { Alert, AlertAction, AlertDescription, AlertTitle } from '@tars/ui/components/alert'
import { Button } from '@tars/ui/components/button'

import { useShellAlertStore } from '../stores/alert'

export default function ShellAlert() {
  const alert = useShellAlertStore((state) => state.alert)
  const dismissAlert = useShellAlertStore((state) => state.dismissAlert)

  if (!alert) return null

  return (
    <div className="pointer-events-none absolute inset-x-0 top-15 z-30 flex justify-center px-4 md:top-3">
      <Alert
        key={alert.id}
        variant={alert.variant}
        className="animate-in fade-in slide-in-from-top-2 pointer-events-auto w-full max-w-2xl shadow-lg duration-200"
      >
        <TriangleAlertIcon />
        <AlertTitle>{alert.title}</AlertTitle>
        {alert.description ? <AlertDescription>{alert.description}</AlertDescription> : null}
        <AlertAction>
          <Button variant="ghost" size="icon-xs" aria-label="Dismiss alert" onClick={dismissAlert}>
            <XIcon />
          </Button>
        </AlertAction>
      </Alert>
    </div>
  )
}
