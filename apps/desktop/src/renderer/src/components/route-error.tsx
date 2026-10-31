import { RotateCcwIcon, TriangleAlertIcon } from 'lucide-react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router'

import { ERRORS } from '@tars/core/errors'
import { Button } from '@tars/ui/components/button'

function errorDetail(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    const data = typeof error.data === 'string' ? error.data : error.statusText

    return [error.status, data].filter(Boolean).join(' · ') || ERRORS.tryAgain
  }

  if (error instanceof Error && error.message) return error.message

  return ERRORS.tryAgain
}

function errorStack(error: unknown): string | null {
  if (error instanceof Error && error.stack) return error.stack

  if (isRouteErrorResponse(error) && error.data instanceof Error && error.data.stack) {
    return error.data.stack
  }

  return null
}

export default function RouteError() {
  const error = useRouteError()
  const stack = errorStack(error)

  return (
    <div className="bg-background flex h-full min-h-0 flex-1 items-center justify-center p-6">
      <div className="border-border bg-card w-full max-w-2xl border p-6 text-center">
        <div className="bg-destructive/10 text-destructive mx-auto flex size-10 items-center justify-center">
          <TriangleAlertIcon className="size-5" />
        </div>

        <h1 className="text-foreground mt-4 text-sm font-medium">Something went wrong</h1>
        <p className="text-muted-foreground mt-1 text-xs">{errorDetail(error)}</p>

        <div className="mt-5 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RotateCcwIcon />
            Reload
          </Button>
          <Button size="sm" render={<Link to="/" />}>
            Back to Desk
          </Button>
        </div>

        {stack ? (
          <div className="border-border mt-5 border-t pt-4 text-left">
            <p className="text-muted-foreground font-mono text-xs">stack trace</p>
            <pre className="text-muted-foreground bg-muted/30 mt-2 max-h-48 overflow-auto p-2 font-mono text-xs wrap-break-word whitespace-pre-wrap">
              {stack}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  )
}
