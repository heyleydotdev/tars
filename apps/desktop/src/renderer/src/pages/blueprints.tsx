import { useEffect, useRef, useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { Link, useLoaderData, useNavigate } from 'react-router'

import { ERRORS } from '@tars/core/errors'
import { formatDateTime } from '@tars/core/utils/format'
import { Button } from '@tars/ui/components/button'
import { Input } from '@tars/ui/components/input'
import { Spinner } from '@tars/ui/components/spinner'

import type { BlueprintsLoaderData } from '../lib/loaders'
import ConsoleHeader from '../components/console-header'
import ConsolePanel from '../components/console-panel'
import EmptyState from '../components/empty-state'
import PendingNavigationGuard from '../components/pending-navigation-guard'
import { useBlueprints, useCreateBlueprint } from '../lib/blueprint'
import { useShellAlertStore } from '../stores/alert'

export default function Blueprints() {
  const initial = useLoaderData<BlueprintsLoaderData>()
  const blueprints = useBlueprints(initial)
  const create = useCreateBlueprint()
  const navigate = useNavigate()
  const showAlert = useShellAlertStore((state) => state.showAlert)
  const [title, setTitle] = useState('')
  const [client, setClient] = useState('')
  const mounted = useRef(true)
  const items = blueprints.data?.items ?? []

  useEffect(() => {
    mounted.current = true

    return () => {
      mounted.current = false
    }
  }, [])

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (!title.trim() || create.isPending) return

    try {
      const detail = await create.mutateAsync({
        title: title.trim(),
        client: client.trim() || null
      })

      if (!mounted.current) return

      setTitle('')
      setClient('')
      navigate(`/blueprints/${detail.blueprint.id}`)
    } catch {
      if (!mounted.current) return

      showAlert({
        title: ERRORS.saveFailedTitle,
        description: ERRORS.blueprintCreateFailed,
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <ConsoleHeader title="blueprints" />

      <div className="bg-border grid flex-1 grid-cols-1 gap-px lg:min-h-0 lg:grid-cols-12">
        <ConsolePanel
          title="blueprints.list"
          count={String(items.length)}
          accent="bg-sky-400"
          className="lg:col-span-12"
        >
          <form
            className="border-border flex flex-col gap-2 border-b p-3 sm:flex-row"
            onSubmit={(event) => void submit(event)}
          >
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Client project, e.g. Booking app for a dental clinic"
              className="h-8 min-w-0 flex-1 text-xs/6"
              maxLength={120}
            />
            <Input
              value={client}
              onChange={(event) => setClient(event.target.value)}
              placeholder="Client (optional)"
              className="h-8 text-xs/6 sm:w-48"
              maxLength={80}
            />
            <Button type="submit" disabled={create.isPending || title.trim().length === 0}>
              {create.isPending ? <Spinner className="size-3.5" /> : <PlusIcon />}
              Create
            </Button>
          </form>

          {items.length === 0 ? (
            <EmptyState
              title="No Blueprints"
              hint="Create one, then paste the client brief, chat export, or call notes."
            />
          ) : (
            <ul className="divide-border divide-y">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/blueprints/${item.id}`}
                    className="hover:bg-muted flex items-center gap-3 px-3 py-2 transition-colors"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="text-foreground block truncate text-xs/6 font-medium">
                        {item.title}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs/6">
                        {item.client ?? 'No client yet'} · {item.summary ?? 'Not mapped yet.'}
                      </span>
                    </span>
                    <span className="font-mono text-xs uppercase">{item.status}</span>
                    <span className="text-muted-foreground text-right text-xs/6">
                      <span className="block font-mono tabular-nums">
                        {item.requirementCount} requirements
                      </span>
                      <span className="block font-mono tabular-nums">
                        {item.openQuestions} open · {formatDateTime(item.updatedAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ConsolePanel>
      </div>

      <PendingNavigationGuard when={create.isPending} />
    </div>
  )
}
