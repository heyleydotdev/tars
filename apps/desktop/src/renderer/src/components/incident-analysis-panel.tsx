import { useEffect, useState } from 'react'
import { CheckIcon, SparklesIcon } from 'lucide-react'

import type { IncidentDetailOutput } from '@tars/core/schemas/incident'
import { ERRORS } from '@tars/core/errors'
import { formatTime } from '@tars/core/utils/format'
import { Button } from '@tars/ui/components/button'
import { Spinner } from '@tars/ui/components/spinner'
import { Textarea } from '@tars/ui/components/textarea'

import {
  useAnswerIncidentQuestion,
  useApproveIncidentPostmortem,
  useFindIncidentRootCause,
  useRebuildIncidentTimeline,
  useSaveIncidentPostmortem
} from '../lib/incident'
import { useLogActivity } from '../lib/journal'
import { useShellAlertStore } from '../stores/alert'

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

  useEffect(() => {
    onPendingChange?.(pending)
  }, [onPendingChange, pending])

  useEffect(() => () => onPendingChange?.(false), [onPendingChange])

  async function approvePostmortem(): Promise<void> {
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
            <div key={question.id} className="space-y-1.5">
              <p className="text-xs/6">{question.text}</p>
              <p className="text-muted-foreground text-xs/6">{question.rationale}</p>
              <div className="flex items-start gap-2">
                <Textarea
                  value={answers[question.id] ?? ''}
                  onChange={(event) =>
                    setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
                  }
                  placeholder="Answer with the fact only you know…"
                  className="min-h-16 text-xs/6"
                />
                <Button
                  type="button"
                  size="xs"
                  disabled={
                    answerQuestion.isPending || (answers[question.id] ?? '').trim().length === 0
                  }
                  onClick={() => void submitAnswer(question.id)}
                >
                  {answerQuestion.isPending ? <Spinner className="size-3.5" /> : <CheckIcon />}
                  Answer
                </Button>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {analysis ? (
        <section className="border-border space-y-2 border-t pt-3">
          <div className="flex items-center gap-2">
            <span
              className={
                analysis.outcome === 'proposed'
                  ? 'border border-emerald-400/60 bg-emerald-400/10 px-1.5 py-0.5 font-mono text-xs/6 text-emerald-300 uppercase'
                  : 'border border-amber-400/60 bg-amber-400/10 px-1.5 py-0.5 font-mono text-xs/6 text-amber-300 uppercase'
              }
            >
              {outcomeLabel(analysis.outcome)}
            </span>
            <span className="text-muted-foreground text-xs/6">
              Confidence <span className="font-mono uppercase">{analysis.confidence}</span>
            </span>
            {analysis.status === 'approved' ? (
              <span className="text-muted-foreground ml-auto font-mono text-xs/6 uppercase">
                approved
              </span>
            ) : null}
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
          <div className="flex items-center justify-between gap-2">
            <p className="text-foreground text-xs/6 font-medium">Postmortem</p>
            <div className="flex gap-1">
              <Button
                type="button"
                size="xs"
                variant="outline"
                disabled={savePostmortem.isPending || postmortem.trim().length === 0}
                onClick={() => savePostmortem.mutate({ incidentId, postmortem })}
              >
                {savePostmortem.isPending ? <Spinner className="size-3.5" /> : null}
                Save
              </Button>
              <Button
                type="button"
                size="xs"
                disabled={
                  approve.isPending ||
                  analysis.status === 'approved' ||
                  postmortem.trim().length === 0
                }
                onClick={() => void approvePostmortem()}
              >
                {approve.isPending ? <Spinner className="size-3.5" /> : <CheckIcon />}
                Approve
              </Button>
            </div>
          </div>
          <Textarea
            value={postmortem}
            onChange={(event) => setDraft({ text: event.target.value, version: serverVersion })}
            className="min-h-72 text-xs/6"
          />
        </section>
      ) : null}
    </div>
  )
}
