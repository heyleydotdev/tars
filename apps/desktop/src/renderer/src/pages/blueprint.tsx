import { useState } from 'react'
import {
  ArrowLeftIcon,
  FileTextIcon,
  ListChecksIcon,
  MessageSquareIcon,
  SaveIcon,
  Trash2Icon,
  WandSparklesIcon
} from 'lucide-react'
import { Link, useLoaderData, useNavigate, useParams } from 'react-router'

import { ERRORS } from '@tars/core/errors'
import { formatDateTime } from '@tars/core/utils/format'
import { Button } from '@tars/ui/components/button'
import { ButtonGroup } from '@tars/ui/components/button-group'
import { CodeBlock, CodeBlockContent } from '@tars/ui/components/code-block'
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

import type { BlueprintLoaderData } from '../lib/loaders'
import ConfirmDialog from '../components/confirm-dialog'
import ConsoleHeader from '../components/console-header'
import ConsolePanel from '../components/console-panel'
import ConsoleTabs from '../components/console-tabs'
import EmptyState from '../components/empty-state'
import PendingNavigationGuard from '../components/pending-navigation-guard'
import {
  useAddBlueprintEvidence,
  useAnswerBlueprintQuestion,
  useBlueprint,
  useDeleteBlueprint,
  useDraftBlueprint,
  useExtractBlueprint,
  useFindBlueprintGaps,
  useSaveBlueprintDraft
} from '../lib/blueprint'
import { useShellAlertStore } from '../stores/alert'

export default function Blueprint() {
  const { id } = useParams<{ id: string }>()
  const initial = useLoaderData<BlueprintLoaderData>()
  const blueprint = useBlueprint(id ?? '', initial)
  const detail = blueprint.data ?? initial
  const navigate = useNavigate()
  const showAlert = useShellAlertStore((state) => state.showAlert)
  const add = useAddBlueprintEvidence()
  const extract = useExtractBlueprint()
  const gaps = useFindBlueprintGaps()
  const answer = useAnswerBlueprintQuestion()
  const draftIt = useDraftBlueprint()
  const save = useSaveBlueprintDraft()
  const remove = useDeleteBlueprint()
  const [section, setSection] = useState('inputs')
  const [kind, setKind] = useState<'text' | 'voice'>('text')
  const [content, setContent] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
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
      await add.mutateAsync({ blueprintId: detail.blueprint.id, kind, content: value })
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

  async function run(action: () => Promise<unknown>): Promise<void> {
    try {
      await action()
    } catch (error) {
      report(error)
    }
  }

  async function deleteBlueprint(): Promise<void> {
    try {
      await remove.mutateAsync({ id: detail.blueprint.id })
      navigate('/blueprints')
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
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Delete blueprint"
              disabled={remove.isPending}
              onClick={() => setDeleting(true)}
            >
              <Trash2Icon />
            </Button>
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
                <ButtonGroup>
                  <Button
                    type="button"
                    size="xs"
                    variant={kind === 'text' ? 'default' : 'outline'}
                    onClick={() => setKind('text')}
                  >
                    Text
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant={kind === 'voice' ? 'default' : 'outline'}
                    onClick={() => setKind('voice')}
                  >
                    Voice note
                  </Button>
                </ButtonGroup>
                <Textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder={
                    kind === 'voice'
                      ? 'Paste the call transcript…'
                      : 'Paste the client brief, chat export, or email…'
                  }
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
                <ul className="divide-border border-border divide-y border-t">
                  {detail.evidence.map((item) => (
                    <li key={item.id} className="space-y-1 px-3 py-2 text-xs/6">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-mono text-xs uppercase">
                          {item.kind}
                        </span>
                        <span className="text-muted-foreground font-mono tabular-nums">
                          {formatDateTime(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-muted-foreground line-clamp-3 whitespace-pre-line">
                        {item.content ?? item.summary}
                      </p>
                    </li>
                  ))}
                </ul>
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
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs uppercase">{item.area}</TableCell>
                        <TableCell className="whitespace-normal">{item.text}</TableCell>
                        <TableCell className="font-mono text-xs uppercase">{item.status}</TableCell>
                        <TableCell className="font-mono text-xs uppercase">
                          {item.confidence}
                        </TableCell>
                        <TableCell className="text-center font-mono tabular-nums">
                          {item.sourceEvidenceIds.length}
                        </TableCell>
                      </TableRow>
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
        title="Delete blueprint?"
        description="This removes the evidence, requirement map, questions, and draft."
        confirmLabel="Delete"
        destructive
        open={deleting}
        pending={remove.isPending}
        onOpenChange={setDeleting}
        onConfirm={() => void deleteBlueprint()}
      />
    </div>
  )
}
