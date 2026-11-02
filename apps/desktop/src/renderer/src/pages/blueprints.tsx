import { useEffect, useRef, useState } from 'react'
import { CopyIcon, ExternalLinkIcon, FileTextIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { Link, useLoaderData, useNavigate } from 'react-router'

import type { BlueprintSummaryOutput } from '@tars/core/schemas/blueprint'
import { ERRORS } from '@tars/core/errors'
import { formatTime, toDateKey } from '@tars/core/utils/format'
import { Badge } from '@tars/ui/components/badge'
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

import type { BlueprintsLoaderData } from '../lib/loaders'
import BlueprintGuideButton from '../components/blueprint-guide-button'
import ConfirmDialog from '../components/confirm-dialog'
import ConsoleDayHeader from '../components/console-day-header'
import ConsoleHeader from '../components/console-header'
import ConsolePanel from '../components/console-panel'
import EmptyState from '../components/empty-state'
import PendingNavigationGuard from '../components/pending-navigation-guard'
import { logAction } from '../lib/activity'
import { BLUEPRINT_STATUS_TONES } from '../lib/badge-tones'
import { useBlueprints, useCreateBlueprint, useDeleteBlueprint } from '../lib/blueprint'
import { groupByDay } from '../lib/group-by-day'
import { useShellAlertStore } from '../stores/alert'

export default function Blueprints() {
  const initial = useLoaderData<BlueprintsLoaderData>()
  const blueprints = useBlueprints(initial)
  const create = useCreateBlueprint()
  const remove = useDeleteBlueprint()
  const navigate = useNavigate()
  const showAlert = useShellAlertStore((state) => state.showAlert)
  const [title, setTitle] = useState('')
  const [client, setClient] = useState('')
  const [deleting, setDeleting] = useState<BlueprintSummaryOutput | null>(null)
  const mounted = useRef(true)
  const items = blueprints.data?.items ?? []
  const groups = groupByDay(items, (item) => toDateKey(item.updatedAt))
  const openQuestions = items.reduce((total, item) => total + item.openQuestions, 0)

  useEffect(() => {
    mounted.current = true

    return () => {
      mounted.current = false
    }
  }, [])

  async function confirmDelete(): Promise<void> {
    if (!deleting) return

    try {
      await remove.mutateAsync({ id: deleting.id })
      logAction('blueprint.deleted', deleting.id, deleting.title)
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

  function copyTitle(blueprint: BlueprintSummaryOutput): void {
    void window.copyText(blueprint.title).catch(() => {
      showAlert({
        title: ERRORS.copyFailedTitle,
        description: ERRORS.copyFailedDetail,
        variant: 'destructive'
      })
    })
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (!title.trim() || create.isPending) return

    try {
      const detail = await create.mutateAsync({
        title: title.trim(),
        client: client.trim() || null
      })

      logAction('blueprint.created', detail.blueprint.id, detail.blueprint.title)
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
      <ConsoleHeader title="blueprints" right={<BlueprintGuideButton />} />

      <div className="bg-border grid flex-1 grid-cols-1 gap-px lg:min-h-0 lg:grid-cols-12">
        <ConsolePanel
          title="blueprints.list"
          count={String(items.length)}
          accent="bg-sky-400"
          className="lg:col-span-12"
          footer={
            <>
              <span>
                <span className="font-mono tabular-nums">{items.length}</span> Blueprint
                {items.length === 1 ? '' : 's'}
              </span>
              <span className="ml-auto">
                <span className="font-mono tabular-nums">{openQuestions}</span> Open question
                {openQuestions === 1 ? '' : 's'}
              </span>
            </>
          }
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
              icon={FileTextIcon}
            />
          ) : (
            groups.map((group) => (
              <section key={group.key}>
                <ConsoleDayHeader label={group.label} count={group.items.length} unit="blueprint" />
                <ul className="divide-border divide-y">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <ContextMenu>
                        <ContextMenuTrigger
                          render={
                            <Link
                              to={`/blueprints/${item.id}`}
                              className="hover:bg-muted/60 flex items-start gap-3 px-3 py-2 transition-colors"
                            />
                          }
                        >
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <Badge
                                variant="default"
                                className={BLUEPRINT_STATUS_TONES[item.status]}
                              >
                                {item.status}
                              </Badge>
                              <span className="text-foreground min-w-0 truncate text-xs/6 font-medium">
                                {item.title}
                              </span>
                            </span>
                            <span className="text-muted-foreground mt-0.5 line-clamp-1 text-xs/6">
                              {item.client ?? 'No client'} · {item.summary ?? 'Not mapped yet.'}
                            </span>
                          </span>
                          <span className="text-muted-foreground shrink-0 text-right font-sans text-xs/6">
                            <span className="font-mono tabular-nums">
                              {formatTime(item.updatedAt)}
                            </span>
                            <span className="block tabular-nums">
                              <span className="text-foreground">{item.requirementCount}</span>{' '}
                              Requirements · {item.openQuestions} Open
                            </span>
                          </span>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onClick={() => navigate(`/blueprints/${item.id}`)}>
                            <ExternalLinkIcon />
                            Open
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => copyTitle(item)}>
                            <CopyIcon />
                            Copy title
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem variant="destructive" onClick={() => setDeleting(item)}>
                            <Trash2Icon />
                            Delete
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </ConsolePanel>
      </div>

      <PendingNavigationGuard when={create.isPending} />

      <ConfirmDialog
        title="Delete blueprint?"
        description="This removes the evidence, requirement map, questions, and draft."
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
