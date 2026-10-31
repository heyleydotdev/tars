import { useState } from 'react'
import { PlusIcon, SirenIcon } from 'lucide-react'
import { Link, useLoaderData, useNavigate } from 'react-router'

import { ERRORS } from '@tars/core/errors'
import { formatDateTime } from '@tars/core/utils/format'
import { Button } from '@tars/ui/components/button'
import { Input } from '@tars/ui/components/input'
import { Spinner } from '@tars/ui/components/spinner'

import type { IncidentsLoaderData } from '../lib/loaders'
import ConsoleEnd from '../components/console-end'
import ConsoleHeader from '../components/console-header'
import ConsolePanel from '../components/console-panel'
import EmptyState from '../components/empty-state'
import IncidentDemoButton from '../components/incident-demo-button'
import { useCreateIncident, useIncidents } from '../lib/incident'
import { useShellAlertStore } from '../stores/alert'

export default function Incidents() {
  const initial = useLoaderData<IncidentsLoaderData>()
  const incidents = useIncidents(initial)
  const create = useCreateIncident()
  const navigate = useNavigate()
  const showAlert = useShellAlertStore((state) => state.showAlert)
  const [title, setTitle] = useState('')
  const items = incidents.data?.items ?? []

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    const value = title.trim()

    if (!value) return

    try {
      const detail = await create.mutateAsync({ title: value })

      setTitle('')
      navigate(`/incidents/${detail.incident.id}`)
    } catch {
      showAlert({
        title: ERRORS.saveFailedTitle,
        description: ERRORS.tryAgain,
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <ConsoleHeader
        title="incidents"
        right={<IncidentDemoButton onDone={(id) => navigate(`/incidents/${id}`)} />}
      />

      <div className="bg-border grid flex-1 grid-cols-1 gap-px">
        <ConsolePanel
          title="incidents.list"
          count={String(items.length)}
          accent="bg-sky-400"
          className="bg-background"
        >
          <form
            className="border-border flex gap-2 border-b p-3"
            onSubmit={(event) => void submit(event)}
          >
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Incident title, e.g. Checkout latency spike"
              className="h-8 text-xs/6"
              maxLength={120}
            />
            <Button type="submit" disabled={create.isPending || title.trim().length === 0}>
              {create.isPending ? <Spinner className="size-3.5" /> : <PlusIcon />}
              Create
            </Button>
          </form>

          {items.length === 0 ? (
            <EmptyState
              title="No Incidents"
              hint="Start a new incident or load the demo to see a reconstructed outage."
              icon={SirenIcon}
            />
          ) : (
            <ul className="divide-border border-border divide-y border-b">
              {items.map((incident) => (
                <li key={incident.id}>
                  <Link
                    to={`/incidents/${incident.id}`}
                    className="hover:bg-muted/20 flex items-start gap-3 p-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-foreground text-xs/6 font-medium">
                          {incident.title}
                        </span>
                        <span className="text-muted-foreground font-mono text-xs/6">
                          {incident.status}
                        </span>
                      </span>
                      <span className="text-muted-foreground mt-0.5 line-clamp-2 block text-xs/6">
                        {incident.summary ?? 'Timeline not merged yet.'}
                      </span>
                    </span>
                    <span className="text-muted-foreground shrink-0 text-right font-mono text-xs/6">
                      {incident.evidenceCount} evidence
                      <span className="block">{formatDateTime(incident.updatedAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ConsolePanel>
      </div>

      <ConsoleEnd />
    </div>
  )
}
