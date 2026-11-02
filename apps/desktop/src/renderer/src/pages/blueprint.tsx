import { useState } from 'react'
import {
  ArrowLeftIcon,
  EyeIcon,
  EyeOffIcon,
  FileTextIcon,
  ListChecksIcon,
  MessageSquareIcon,
  SaveIcon,
  Trash2Icon,
  WandSparklesIcon
} from 'lucide-react'
import { Link, useLoaderData, useParams } from 'react-router'

import type {
  BlueprintEvidenceOutput,
  BlueprintRequirementOutput
} from '@tars/core/schemas/blueprint'
import { ERRORS } from '@tars/core/errors'
import { formatTime, toDateKey } from '@tars/core/utils/format'
import { Badge } from '@tars/ui/components/badge'
import { Button } from '@tars/ui/components/button'
import { ButtonGroup } from '@tars/ui/components/button-group'
import { CodeBlock, CodeBlockContent } from '@tars/ui/components/code-block'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@tars/ui/components/context-menu'
import { Spinner } from '@tars/ui/components/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@tars/ui/components/table'
import { TabsContent } from '@tars/ui/components/tabs'
import { Textarea } from '@tars/ui/components/textarea'
import { cn } from '@tars/ui/lib/utils'

import type { BlueprintLoaderData } from '../lib/loaders'
import ConfirmDialog from '../components/confirm-dialog'
import ConsoleDayHeader from '../components/console-day-header'
import ConsoleHeader from '../components/console-header'
import ConsolePanel from '../components/console-panel'
import ConsoleTabs from '../components/console-tabs'
import EmptyState from '../components/empty-state'
import PendingNavigationGuard from '../components/pending-navigation-guard'
import { REQUIREMENT_CONFIDENCE_TONES, REQUIREMENT_STATUS_TONES } from '../lib/badge-tones'
import {
  useAddBlueprintEvidence,
  useAnswerBlueprintQuestion,
  useBlueprint,
  useDraftBlueprint,
  useExtractBlueprint,
  useFindBlueprintGaps,
  useRemoveBlueprintEvidence,
  useRemoveBlueprintRequirement,
  useSaveBlueprintDraft,
  useSetBlueprintRequirementEnabled
} from '../lib/blueprint'
import { groupByDay } from '../lib/group-by-day'
import { useShellAlertStore } from '../stores/alert'

export default function Blueprint() {
  const { id } = useParams<{ id: string }>()
  const initial = useLoaderData<BlueprintLoaderData>()
  const blueprint = useBlueprint(id ?? '', initial)
  const detail = blueprint.data ?? initial
  const showAlert = useShellAlertStore((state) => state.showAlert)
  const add = useAddBlueprintEvidence()
  const removeEvidence = useRemoveBlueprintEvidence()
  const setRequirementEnabled = useSetBlueprintRequirementEnabled()
  const removeRequirement = useRemoveBlueprintRequirement()
  const extract = useExtractBlueprint()
  const gaps = useFindBlueprintGaps()
  const answer = useAnswerBlueprintQuestion()
  const draftIt = useDraftBlueprint()
  const save = useSaveBlueprintDraft()
  const [section, setSection] = useState('inputs')
  const [content, setContent] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [removing, setRemoving] = useState<BlueprintEvidenceOutput | null>(null)
  const [removingRequirement, setRemovingRequirement] = useState<BlueprintRequirementOutput | null>(
    null
  )
  const evidenceGroups = groupByDay(detail.evidence, (item) => toDateKey(item.createdAt))
  const openQuestions = detail.questions.filter((question) => question.status === 'open')
  const draftText = draft ?? detail.draft ?? ''
  const running = extract.isPending || gaps.isPending || draftIt.isPending
  const referenceIndex = new Map<string, number>()

  for (const match of draftText.matchAll(/\[req:([^\]]+)\]/g)) {
    const id = match[1] ?? ''

    if (id && !referenceIndex.has(id)) referenceIndex.set(id, referenceIndex.size + 1)
  }

  const displayDraft = draftText.replace(
    /\[req:([^\]]+)\]/g,
    (_match, id: string) => `[${referenceIndex.get(id) ?? '?'}]`
  )
  const references = [...referenceIndex.entries()].map(([id, index]) => ({
    index,
    requirement: detail.requirements.find((item) => item.id === id)
  }))

  function report(error: unknown): void {
    showAlert({
      title: ERRORS.saveFailedTitle,
      description: error instanceof Error ? error.message : ERRORS.blueprintExtractionFailed,
      variant: 'destructive'
    })
  }

  async function submitEvidence(): Promise<void> {
    const value = content.trim()

    if (!value || add.isPending) return

    try {
      await add.mutateAsync({ blueprintId: detail.blueprint.id, kind: 'text', content: value })
      setContent('')
    } catch (error) {
      report(error)
    }
  }

  async function submitAnswer(questionId: string): Promise<void> {
    const value = (answers[questionId] ?? '').trim()

    if (!value || answer.isPending) return

    try {
      await answer.mutateAsync({ questionId, answer: value })
      setAnswers((current) => ({ ...current, [questionId]: '' }))
    } catch (error) {
      report(error)
    }
  }

  async function confirmRemove(): Promise<void> {
    if (!removing) return

    try {
      await removeEvidence.mutateAsync({ evidenceId: removing.id })
      setRemoving(null)
    } catch (error) {
      setRemoving(null)
      report(error)
    }
  }

  async function toggleRequirement(item: BlueprintRequirementOutput): Promise<void> {
    try {
      await setRequirementEnabled.mutateAsync({
        requirementId: item.id,
        enabled: !item.enabled
      })
    } catch (error) {
      report(error)
    }
  }

  async function confirmRemoveRequirement(): Promise<void> {
    if (!removingRequirement) return

    try {
      await removeRequirement.mutateAsync({ requirementId: removingRequirement.id })
      setRemovingRequirement(null)
    } catch (error) {
      setRemovingRequirement(null)
      report(error)
    }
  }

  async function run(action: () => Promise<unknown>): Promise<void> {
    try {
      await action()
    } catch (error) {
      report(error)
    }
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <ConsoleHeader
        title="blueprint"
        right={
          <div className="flex items-center gap-2">
            <Link
              to="/blueprints"
              className="text-muted-foreground hover:text-foreground text-xs/6"
            >
              <span className="flex items-center gap-1">
                <ArrowLeftIcon className="size-3.5" />
                Blueprints
              </span>
            </Link>
            <span className="text-foreground max-w-64 truncate text-xs/6 font-medium">
              {detail.blueprint.title}
            </span>
          </div>
        }
      />

      <ConsoleTabs
        value={section}
        onValueChange={setSection}
        items={[
          { value: 'inputs', label: 'Evidence & Requirements' },
          { value: 'output', label: 'Questions & Draft' }
        ]}
      >
        <TabsContent value="inputs" className="flex flex-1 flex-col lg:min-h-0">
          <div className="bg-border grid flex-1 grid-cols-1 gap-px lg:min-h-0 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)]">
            <ConsolePanel
              title="evidence.in"
              count={String(detail.evidence.length)}
              accent="bg-sky-400"
              className="lg:col-span-4"
            >
              <div className="space-y-2 p-3">
                <Textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Paste the client brief, chat export, or call transcript…"
                  className="min-h-28 text-xs/6"
                  maxLength={12_000}
                  disabled={add.isPending}
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={add.isPending || content.trim().length === 0}
                  onClick={() => void submitEvidence()}
                >
                  {add.isPending ? <Spinner className="size-3.5" /> : <FileTextIcon />}
                  Add evidence
                </Button>
              </div>

              {detail.evidence.length === 0 ? (
                <EmptyState
                  title="No Evidence Yet"
                  hint="Paste the brief, an email thread, or a transcript to map requirements."
                />
              ) : (
                <div className="border-border border-t">
                  {evidenceGroups.map((group) => (
                    <section key={group.key}>
                      <ConsoleDayHeader
                        label={group.label}
                        count={group.items.length}
                        unit="item"
                      />
                      <ul className="divide-border divide-y">
                        {group.items.map((item) => {
                          const text = item.content ?? item.summary ?? 'Evidence'
                          const open = expanded[item.id] ?? false

                          return (
                            <li key={item.id}>
                              <ContextMenu>
                                <ContextMenuTrigger
                                  render={
                                    <div className="hover:bg-muted grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-2 px-3 py-2 transition-colors" />
                                  }
                                >
                                  <span className="text-muted-foreground font-mono text-xs/6 tabular-nums">
                                    {formatTime(item.createdAt)}
                                  </span>
                                  <div className="min-w-0">
                                    {item.kind === 'text' ? null : (
                                      <Badge
                                        variant="default"
                                        className="bg-muted text-muted-foreground capitalize"
                                      >
                                        {item.kind}
                                      </Badge>
                                    )}
                                    <p
                                      className={cn(
                                        'text-muted-foreground text-xs/6 whitespace-pre-line',
                                        open ? 'break-words' : 'line-clamp-3'
                                      )}
                                    >
                                      {text}
                                    </p>
                                    {item.status === 'pending' ? (
                                      <span className="text-muted-foreground mt-1 flex items-center gap-1 text-xs/6">
                                        <Spinner className="size-3" /> Reading…
                                      </span>
                                    ) : null}
                                    {item.status === 'error' ? (
                                      <span className="text-destructive mt-1 block text-xs/6">
                                        {item.error ?? ERRORS.blueprintExtractionFailed}
                                      </span>
                                    ) : null}
                                    {text.length > 180 ? (
                                      <button
                                        type="button"
                                        aria-expanded={open}
                                        onClick={() =>
                                          setExpanded((current) => ({
                                            ...current,
                                            [item.id]: !open
                                          }))
                                        }
                                        className="text-muted-foreground hover:text-foreground mt-1 text-xs/6 underline-offset-2 hover:underline"
                                      >
                                        {open ? 'Show less' : 'Show more'}
                                      </button>
                                    ) : null}
                                  </div>
                                </ContextMenuTrigger>
                                <ContextMenuContent>
                                  <ContextMenuItem
                                    variant="destructive"
                                    onClick={() => setRemoving(item)}
                                  >
                                    <Trash2Icon />
                                    Delete
                                  </ContextMenuItem>
                                </ContextMenuContent>
                              </ContextMenu>
                            </li>
                          )
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </ConsolePanel>

            <ConsolePanel
              title="requirement.map"
              count={String(detail.requirements.length)}
              accent="bg-emerald-400"
              className="lg:col-span-8"
              headerRight={
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={running || detail.evidence.length === 0}
                  onClick={() => void run(() => extract.mutateAsync({ id: detail.blueprint.id }))}
                >
                  {extract.isPending ? <Spinner className="size-3.5" /> : <ListChecksIcon />}
                  Map requirements
                </Button>
              }
            >
              {detail.requirements.length === 0 ? (
                <EmptyState
                  title="Not Mapped Yet"
                  hint="Add evidence, then map the requirements."
                />
              ) : (
                <Table className="border-border border">
                  <TableHeader>
                    <TableRow>
                      {['Area', 'Requirement', 'Status', 'Confidence', 'Sources'].map((label) => (
                        <TableHead key={label} className="text-muted-foreground">
                          {label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.requirements.map((item) => (
                      <ContextMenu key={item.id}>
                        <ContextMenuTrigger
                          render={<TableRow className={item.enabled ? undefined : 'opacity-50'} />}
                        >
                          <TableCell className="font-mono text-xs uppercase">{item.area}</TableCell>
                          <TableCell className="whitespace-normal">{item.text}</TableCell>
                          <TableCell>
                            <Badge
                              variant="default"
                              className={REQUIREMENT_STATUS_TONES[item.status]}
                            >
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="default"
                              className={REQUIREMENT_CONFIDENCE_TONES[item.confidence]}
                            >
                              {item.confidence}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono tabular-nums">
                            {item.sourceEvidenceIds.length}
                          </TableCell>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onClick={() => void toggleRequirement(item)}>
                            {item.enabled ? <EyeOffIcon /> : <EyeIcon />}
                            {item.enabled ? 'Disable' : 'Enable'}
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            variant="destructive"
                            onClick={() => setRemovingRequirement(item)}
                          >
                            <Trash2Icon />
                            Delete
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ConsolePanel>
          </div>
        </TabsContent>

        <TabsContent value="output" className="flex flex-1 flex-col lg:min-h-0">
          <div className="bg-border grid flex-1 grid-cols-1 gap-px lg:min-h-0 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)]">
            <ConsolePanel
              title="open.questions"
              count={String(openQuestions.length)}
              accent="bg-amber-300"
              className="lg:col-span-5"
              headerRight={
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={running || detail.requirements.length === 0}
                  onClick={() =>
                    void run(async () => {
                      await gaps.mutateAsync({ id: detail.blueprint.id })
                      setSection('output')
                    })
                  }
                >
                  {gaps.isPending ? <Spinner className="size-3.5" /> : <MessageSquareIcon />}
                  Find gaps
                </Button>
              }
            >
              {openQuestions.length === 0 ? (
                <EmptyState
                  title="Nothing Open"
                  hint="Map requirements and find gaps. Questions will show up here."
                />
              ) : (
                <div className="space-y-3 p-3">
                  {openQuestions.map((question) => (
                    <div key={question.id} className="space-y-1.5">
                      <p className="text-xs/6">{question.text}</p>
                      <p className="text-muted-foreground text-xs/6">{question.rationale}</p>
                      <div className="flex items-start gap-2">
                        <Textarea
                          value={answers[question.id] ?? ''}
                          onChange={(event) =>
                            setAnswers((current) => ({
                              ...current,
                              [question.id]: event.target.value
                            }))
                          }
                          placeholder="Answer with the fact only the client knows…"
                          className="min-h-16 text-xs/6"
                        />
                        <Button
                          type="button"
                          size="sm"
                          disabled={
                            answer.isPending || (answers[question.id] ?? '').trim().length === 0
                          }
                          onClick={() => void submitAnswer(question.id)}
                        >
                          {answer.isPending ? <Spinner className="size-3.5" /> : null}
                          Answer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ConsolePanel>

            <ConsolePanel
              title="proposal.draft"
              count={detail.draft ? 'md' : '—'}
              accent="bg-violet-400"
              className="lg:col-span-7"
              headerRight={
                <ButtonGroup>
                  <Button
                    type="button"
                    size="xs"
                    disabled={running || detail.requirements.length === 0}
                    onClick={() =>
                      void run(async () => {
                        await draftIt.mutateAsync({ id: detail.blueprint.id })
                        setDraft(null)
                        setSection('output')
                      })
                    }
                  >
                    {draftIt.isPending ? <Spinner className="size-3.5" /> : <WandSparklesIcon />}
                    Draft proposal
                  </Button>
                  {detail.draft ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => setEditing((current) => !current)}
                      >
                        {editing ? 'Done' : 'Edit'}
                      </Button>
                      {editing ? (
                        <Button
                          type="button"
                          size="xs"
                          disabled={save.isPending || draftText.trim().length === 0}
                          onClick={() =>
                            void run(async () => {
                              await save.mutateAsync({
                                blueprintId: detail.blueprint.id,
                                draft: draftText
                              })
                              setDraft(null)
                              setEditing(false)
                            })
                          }
                        >
                          {save.isPending ? <Spinner className="size-3.5" /> : <SaveIcon />}
                          Save
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                </ButtonGroup>
              }
            >
              {detail.draft ? (
                editing ? (
                  <div className="p-3">
                    <Textarea
                      value={draftText}
                      onChange={(event) => setDraft(event.target.value)}
                      className="min-h-112 font-sans text-xs/6"
                    />
                  </div>
                ) : (
                  <div className="space-y-3 p-3">
                    <CodeBlock>
                      <CodeBlockContent wrap className="max-h-128 font-sans text-sm/6">
                        {displayDraft}
                      </CodeBlockContent>
                    </CodeBlock>
                    {references.length > 0 ? (
                      <ol className="text-muted-foreground space-y-0.5 text-xs/6">
                        {references.map((reference) => (
                          <li key={reference.index}>
                            {reference.index}.{' '}
                            {reference.requirement
                              ? `${reference.requirement.area} — ${reference.requirement.text}`
                              : 'Removed requirement'}
                          </li>
                        ))}
                      </ol>
                    ) : null}
                  </div>
                )
              ) : (
                <EmptyState
                  title="No Draft Yet"
                  hint="Map the requirements, close gaps, then draft the proposal."
                />
              )}
            </ConsolePanel>
          </div>
        </TabsContent>
      </ConsoleTabs>

      <PendingNavigationGuard when={running} />

      <ConfirmDialog
        title="Delete evidence?"
        description="Requirements that cite it stay until you map requirements again."
        confirmLabel="Delete"
        destructive
        open={removing !== null}
        pending={removeEvidence.isPending}
        onOpenChange={(open) => {
          if (!open) setRemoving(null)
        }}
        onConfirm={() => void confirmRemove()}
      />

      <ConfirmDialog
        title="Delete requirement?"
        description="The requirement disappears from the map, and from gap checks and drafts."
        confirmLabel="Delete"
        destructive
        open={removingRequirement !== null}
        pending={removeRequirement.isPending}
        onOpenChange={(open) => {
          if (!open) setRemovingRequirement(null)
        }}
        onConfirm={() => void confirmRemoveRequirement()}
      />
    </div>
  )
}
