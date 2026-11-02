import { useEffect, useState } from 'react'
import { CheckIcon, SparklesIcon } from 'lucide-react'

import type { IncidentDetailOutput } from '@tars/core/schemas/incident'
import { ERRORS } from '@tars/core/errors'
import { formatTime } from '@tars/core/utils/format'
import { Badge } from '@tars/ui/components/badge'
import { Button } from '@tars/ui/components/button'
import { Markdown } from '@tars/ui/components/markdown'
import { Spinner } from '@tars/ui/components/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@tars/ui/components/tabs'
import { Textarea } from '@tars/ui/components/textarea'

import { INCIDENT_CONFIDENCE_TONES } from '../lib/badge-tones'
import { useDebouncedSave } from '../lib/debounced-save'
import {
  useAnswerIncidentQuestion,
  useApproveIncidentPostmortem,
  useFindIncidentRootCause,
  useRebuildIncidentTimeline,
  useSaveIncidentPostmortem
} from '../lib/incident'
import { useLogActivity } from '../lib/journal'
import { useShellAlertStore } from '../stores/alert'
import QuestionField from './question-field'

function outcomeLabel(outcome: 'proposed' | 'inconclusive'): string {
  return outcome === 'proposed' ? 'likely cause' : 'inconclusive'
}

export default function IncidentAnalysisPanel({
  detail,
  onHighlightEvents,
  onPendingChange
}: {
  detail: IncidentDetailOutput
  onHighlightEvents: (ids: Set<string>) => void
  onPendingChange?: (pending: boolean) => void
}) {
  const incidentId = detail.incident.id
  const analysis = detail.analysis
  const openQuestions = analysis
    ? []
    : detail.questions.filter((question) => question.status === 'open')
  const findRootCause = useFindIncidentRootCause()
  const answerQuestion = useAnswerIncidentQuestion()
  const rebuild = useRebuildIncidentTimeline()
  const savePostmortem = useSaveIncidentPostmortem()
  const approve = useApproveIncidentPostmortem()
  const logActivity = useLogActivity()
  const showAlert = useShellAlertStore((state) => state.showAlert)
  const pending =
    findRootCause.isPending ||
    answerQuestion.isPending ||
    rebuild.isPending ||
    savePostmortem.isPending ||
    approve.isPending
  const [draft, setDraft] = useState<{ text: string; version: string } | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const serverPostmortem = analysis?.postmortem ?? ''
  const serverVersion = analysis?.updatedAt ?? ''
  const postmortem = draft?.version === serverVersion ? draft.text : serverPostmortem

  function reportSave(): void {
    showAlert({
      title: ERRORS.saveFailedTitle,
      description: ERRORS.incidentAnalysisFailed,
      variant: 'destructive'
    })
  }

  const postmortemSave = useDebouncedSave((value) => {
    savePostmortem.mutate({ incidentId, postmortem: value }, { onError: reportSave })
  })

  useEffect(() => {
    onPendingChange?.(pending)
  }, [onPendingChange, pending])

  useEffect(() => () => onPendingChange?.(false), [onPendingChange])

  function updatePostmortem(value: string): void {
    setDraft({ text: value, version: serverVersion })

    if (value === serverPostmortem) return

    postmortemSave.schedule(value)
  }

  function flushPostmortem(): void {
    if (!draft || draft.text === serverPostmortem) return

    postmortemSave.flush(draft.text)
  }

  async function approvePostmortem(): Promise<void> {
    // A blur-triggered autosave would land after the approval and reset it to draft.
    if (savePostmortem.isPending) return

    postmortemSave.cancel()

    try {
      const detail = await approve.mutateAsync({ incidentId, postmortem })

      logActivity.mutate({
        events: [
          {
            type: 'incident.approved',
            incidentId: detail.incident.id,
            title: detail.incident.title,
            occurredAt: new Date().toISOString()
          }
        ]
      })
    } catch {
      showAlert({
        title: ERRORS.saveFailedTitle,
        description: ERRORS.incidentAnalysisFailed,
        variant: 'destructive'
      })
    }
  }

  async function submitAnswer(questionId: string): Promise<void> {
    const answer = (answers[questionId] ?? '').trim()

    if (!answer) return

    try {
      await answerQuestion.mutateAsync({ questionId, answer })
    } catch {
      showAlert({
        title: ERRORS.saveFailedTitle,
        description: ERRORS.incidentAnalysisFailed,
        variant: 'destructive'
      })
      return
    }

    setAnswers((current) => ({ ...current, [questionId]: '' }))

    await rebuild.mutateAsync({ incidentId }).catch(() => {
      showAlert({
        title: ERRORS.saveFailedTitle,
        description: ERRORS.incidentMergeFailed,
        variant: 'destructive'
      })
    })
  }

  const supporting = analysis
    ? analysis.supportingEventIds.flatMap((id) => {
        const event = detail.events.find((item) => item.id === id)

        return event ? [event] : []
      })
    : []

  return (
    <div className="flex flex-col gap-4 p-3">
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-foreground text-xs/6 font-medium">Summary</p>
          <Button
            type="button"
            size="xs"
            disabled={findRootCause.isPending || detail.events.length === 0}
            onClick={() => findRootCause.mutate({ incidentId })}
          >
            {findRootCause.isPending ? <Spinner className="size-3.5" /> : <SparklesIcon />}
            Find root cause
          </Button>
        </div>
        <p className="text-muted-foreground text-xs/6">
          {detail.incident.summary ?? 'The summary appears once the timeline is merged.'}
        </p>
        {findRootCause.isError ? (
          <p className="text-destructive text-xs/6">{ERRORS.incidentAnalysisFailed}</p>
        ) : null}
      </section>

      {openQuestions.length > 0 ? (
        <section className="border-border space-y-3 border-t pt-3">
          <p className="text-foreground text-xs/6 font-medium">Needs more evidence</p>
          {openQuestions.map((question) => (
            <QuestionField
              key={question.id}
              question={question}
              value={answers[question.id] ?? ''}
              pending={
                answerQuestion.isPending && answerQuestion.variables.questionId === question.id
              }
              placeholder="Answer with the fact only you know…"
              size="xs"
              onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}
              onSubmit={() => void submitAnswer(question.id)}
            />
          ))}
        </section>
      ) : null}

      {analysis ? (
        <section className="border-border space-y-2 border-t pt-3">
          <div className="flex items-center gap-2">
            <Badge
              variant="default"
              className={
                analysis.outcome === 'proposed'
                  ? 'bg-emerald-400/15 text-emerald-300 capitalize'
                  : 'bg-amber-400/15 text-amber-300 capitalize'
              }
            >
              {outcomeLabel(analysis.outcome)}
            </Badge>
            <Badge variant="default" className={INCIDENT_CONFIDENCE_TONES[analysis.confidence]}>
              {analysis.confidence}
            </Badge>
          </div>
          <p className="text-xs/6">{analysis.rootCause}</p>
          {supporting.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {supporting.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onHighlightEvents(new Set([event.id]))}
                  className="border border-emerald-400/40 px-1.5 py-0.5 text-xs/6 hover:bg-emerald-400/10"
                >
                  <span className="font-mono tabular-nums">
                    {event.occurredAt ? formatTime(event.occurredAt) : 'undated'}
                  </span>{' '}
                  · {event.description.slice(0, 42)}
                </button>
              ))}
            </div>
          ) : null}
          {analysis.alternatives.length > 0 ? (
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs/6">Ruled out</p>
              <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-xs/6">
                {analysis.alternatives.map((alternative) => (
                  <li key={alternative.text}>
                    {alternative.text} — {alternative.whyRejected}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {analysis?.postmortem ? (
        <section className="border-border space-y-2 border-t pt-3">
          <div className="flex items-center gap-2">
            <p className="text-foreground text-xs/6 font-medium">Postmortem</p>
            <Badge
              variant="default"
              className={
                analysis.status === 'approved'
                  ? 'bg-emerald-400/15 text-emerald-300 capitalize'
                  : 'bg-muted text-muted-foreground capitalize'
              }
            >
              {analysis.status}
            </Badge>
            {savePostmortem.isPending ? (
              <span className="text-muted-foreground flex items-center gap-1 font-mono text-xs">
                <Spinner className="size-3" /> Saving…
              </span>
            ) : null}
            <Button
              type="button"
              size="xs"
              className="ml-auto"
              disabled={
                approve.isPending ||
                savePostmortem.isPending ||
                analysis.status === 'approved' ||
                postmortem.trim().length === 0
              }
              onClick={() => void approvePostmortem()}
            >
              {approve.isPending ? <Spinner className="size-3.5" /> : <CheckIcon />}
              Approve
            </Button>
          </div>
          <Tabs defaultValue="preview" className="flex flex-col gap-0">
            <TabsList
              variant="line"
              className="border-border h-8 w-full justify-start gap-0 rounded-none border-b bg-transparent p-0"
            >
              {[
                { value: 'edit', label: 'Edit' },
                { value: 'preview', label: 'Preview' }
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="after:bg-foreground flex-none rounded-none border-r px-3 text-xs tracking-wide"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="edit" className="pt-2">
              <Textarea
                value={postmortem}
                onChange={(event) => updatePostmortem(event.target.value)}
                onBlur={flushPostmortem}
                className="min-h-72 text-xs/6"
              />
            </TabsContent>
            <TabsContent value="preview" className="pt-2">
              <Markdown>{postmortem}</Markdown>
            </TabsContent>
          </Tabs>
        </section>
      ) : null}
    </div>
  )
}
