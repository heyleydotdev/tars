import { useEffect, useState } from 'react'
import { CopyIcon, ExternalLinkIcon, PlusIcon, SirenIcon, Trash2Icon } from 'lucide-react'
import { Link, useLoaderData, useNavigate } from 'react-router'

import type { IncidentSummaryOutput } from '@tars/core/schemas/incident'
import { ERRORS } from '@tars/core/errors'
import { formatTime, toDateKey } from '@tars/core/utils/format'
import { Button } from '@tars/ui/components/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@tars/ui/components/context-menu'
import { Input } from '@tars/ui/components/input'
import { Spinner } from '@tars/ui/components/spinner'

import type { IncidentsLoaderData } from '../lib/loaders'
import ConfirmDialog from '../components/confirm-dialog'
import ConsoleHeader from '../components/console-header'
import ConsolePanel from '../components/console-panel'
import EmptyState from '../components/empty-state'
import IncidentDayHeader from '../components/incident-day-header'
import IncidentDemoButton from '../components/incident-demo-button'
import { useCreateIncident, useDeleteIncident, useIncidents } from '../lib/incident'
import { useShellAlertStore } from '../stores/alert'
import { useIncidentDemoStore } from '../stores/incident-demo'

function groupIncidentsByDay(
  items: Array<IncidentSummaryOutput>
): Array<{ key: string; label: string; items: Array<IncidentSummaryOutput> }> {
  const groups: Array<{ key: string; label: string; items: Array<IncidentSummaryOutput> }> = []

  for (const incident of items) {
    const key = toDateKey(incident.updatedAt)
    const last = groups[groups.length - 1]

    if (last?.key === key) {
      last.items.push(incident)
      continue
    }

    groups.push({ key, label: key, items: [incident] })
  }

  return groups
}

export default function Incidents() {
  const initial = useLoaderData<IncidentsLoaderData>()
  const incidents = useIncidents(initial)
  const create = useCreateIncident()
  const remove = useDeleteIncident()
  const navigate = useNavigate()
  const showAlert = useShellAlertStore((state) => state.showAlert)
  const [title, setTitle] = useState('')
  const [deleting, setDeleting] = useState<IncidentSummaryOutput | null>(null)
  const items = incidents.data?.items ?? []
  const groups = groupIncidentsByDay(items)
  const openCount = items.filter((incident) => incident.status === 'open').length
  const demoRunning = useIncidentDemoStore((state) => state.running)
  const consumeIncidentId = useIncidentDemoStore((state) => state.consumeIncidentId)

  useEffect(() => {
    if (demoRunning) return

    const incidentId = consumeIncidentId()

    if (incidentId) navigate(`/incidents/${incidentId}`)
  }, [consumeIncidentId, demoRunning, navigate])

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

  async function confirmDelete(): Promise<void> {
    if (!deleting) return

    try {
      await remove.mutateAsync({ incidentId: deleting.id })
      setDeleting(null)
    } catch {
      setDeleting(null)
      showAlert({
        title: ERRORS.deleteFailed,
        description: ERRORS.tryAgain,
        variant: 'destructive'
      })
    }
  }

  function copyTitle(incident: IncidentSummaryOutput): void {
    void window.copyText(incident.title).catch(() => {
      showAlert({
        title: ERRORS.copyFailedTitle,
        description: ERRORS.copyFailedDetail,
        variant: 'destructive'
      })
    })
  }

  return (
    <div className="flex min-h-full flex-col lg:min-h-0 lg:flex-1">
      <ConsoleHeader title="incidents" right={<IncidentDemoButton />} />

      <div className="bg-border grid flex-1 grid-cols-1 gap-px lg:min-h-0 lg:overflow-hidden">
        <ConsolePanel
          title="incidents.list"
          count={String(items.length)}
          accent="bg-sky-400"
          className="bg-background"
          footer={
            <>
              <span>
                {items.length} incident{items.length === 1 ? '' : 's'}
              </span>
              <span className="ml-auto">{openCount} open</span>
            </>
          }
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
            <div className="border-border border-t">
              {groups.map((group) => (
                <section key={group.key}>
                  <IncidentDayHeader
                    label={group.label}
                    count={group.items.length}
                    unit="incident"
                  />
                  <ul className="divide-border divide-y">
                    {group.items.map((incident) => (
                      <li key={incident.id}>
                        <ContextMenu>
                          <ContextMenuTrigger
                            render={
                              <Link
                                to={`/incidents/${incident.id}`}
                                className="hover:bg-muted flex items-start gap-3 px-3 py-2 transition-colors"
                              />
                            }
                          >
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span className="text-foreground line-clamp-1 text-xs/6 font-medium">
                                  {incident.title}
                                </span>
                                <span
                                  className={
                                    incident.status === 'open'
                                      ? 'font-mono text-xs/6 text-amber-300 uppercase'
                                      : 'font-mono text-xs/6 text-emerald-400 uppercase'
                                  }
                                >
                                  {incident.status}
                                </span>
                              </span>
                              <span className="text-muted-foreground mt-0.5 line-clamp-1 text-xs/6">
                                {incident.summary ?? 'Timeline not merged yet.'}
                              </span>
                            </span>
                            <span className="text-muted-foreground shrink-0 text-right font-mono text-xs/6">
                              {incident.evidenceCount} evidence
                              <span className="block">{formatTime(incident.updatedAt)}</span>
                            </span>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem onClick={() => navigate(`/incidents/${incident.id}`)}>
                              <ExternalLinkIcon />
                              Open
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => copyTitle(incident)}>
                              <CopyIcon />
                              Copy title
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem
                              variant="destructive"
                              onClick={() => setDeleting(incident)}
                            >
                              <Trash2Icon />
                              Delete
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </ConsolePanel>
      </div>

      <ConfirmDialog
        title="Delete incident?"
        description="This removes the incident, its evidence, timeline, and analysis."
        confirmLabel="Delete"
        destructive
        open={deleting !== null}
        pending={remove.isPending}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
