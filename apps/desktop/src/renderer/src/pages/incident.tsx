import { useState } from 'react'
import { ArrowLeftIcon } from 'lucide-react'
import { Link, useLoaderData, useParams } from 'react-router'
import { useShallow } from 'zustand/react/shallow'

import { TabsContent } from '@tars/ui/components/tabs'

import type { IncidentLoaderData } from '../lib/loaders'
import ConsoleHeader from '../components/console-header'
import ConsolePanel from '../components/console-panel'
import ConsoleTabs from '../components/console-tabs'
import IncidentAnalysisPanel from '../components/incident-analysis-panel'
import IncidentEvidencePanel from '../components/incident-evidence-panel'
import IncidentTimeline from '../components/incident-timeline'
import PendingNavigationGuard from '../components/pending-navigation-guard'
import { useIncident } from '../lib/incident'
import { useIncidentDemoStore } from '../stores/incident-demo'

export default function Incident() {
  const initial = useLoaderData<IncidentLoaderData>()
  const { id } = useParams<{ id: string }>()
  const incident = useIncident(id ?? '', initial)
  const detail = incident.data ?? initial
  const [section, setSection] = useState('activity')
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null)
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set())
  const [evidencePending, setEvidencePending] = useState(false)
  const [analysisPending, setAnalysisPending] = useState(false)
  const demo = useIncidentDemoStore(
    useShallow((state) => ({
      running: state.running,
      done: state.done,
      total: state.total,
      incidentId: state.incidentId
    }))
  )

  function highlightEvents(ids: Set<string>): void {
    setHighlighted(ids)

    const [first] = ids

    if (!first) return

    document
      .querySelector(`[data-event-id="${first}"]`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  function showEvents(ids: Set<string>): void {
    setSection('activity')
    window.setTimeout(() => highlightEvents(ids), 0)
  }

  function selectEvidence(id: string): void {
    setSelectedEvidenceId(id)

    const eventIds = detail.events
      .filter((event) => event.sourceEvidenceIds.includes(id))
      .map((event) => event.id)

    showEvents(new Set(eventIds))
  }

  return (
    <div className="flex min-h-full flex-col lg:min-h-0 lg:flex-1">
      <ConsoleHeader
        title="incident"
        right={
          <div className="flex items-center gap-2">
            {demo.running && demo.incidentId === detail.incident.id ? (
              <span className="text-muted-foreground font-mono text-xs/6 tabular-nums">
                ({demo.done}/{demo.total}) Building...
              </span>
            ) : null}
            <span className="text-foreground max-w-64 truncate text-xs/6 font-medium">
              {detail.incident.title}
            </span>
            <Link to="/incidents" className="text-muted-foreground hover:text-foreground text-xs/6">
              <span className="flex items-center gap-1">
                <ArrowLeftIcon className="size-3.5" />
                Incidents
              </span>
            </Link>
          </div>
        }
      />

      <ConsoleTabs
        value={section}
        onValueChange={setSection}
        items={[
          { value: 'activity', label: 'Evidence & Timeline' },
          {
            value: 'postmortem',
            label: 'Postmortem',
            count: detail.analysis?.status === 'approved' ? 'approved' : undefined
          }
        ]}
      >
        <TabsContent value="activity" keepMounted className="flex flex-1 flex-col lg:min-h-0">
          <div className="bg-border grid flex-1 grid-cols-1 gap-px lg:min-h-0 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)]">
            <ConsolePanel
              title="evidence.in"
              count={String(detail.evidence.length)}
              accent="bg-sky-400"
              className="lg:col-span-4"
              footer={
                <>
                  <span>
                    <span className="font-mono tabular-nums">{detail.evidence.length}</span>{' '}
                    Evidence
                  </span>
                  <span className="ml-auto">
                    <span className="font-mono tabular-nums">
                      {detail.evidence.filter((item) => item.status === 'ready').length}
                    </span>{' '}
                    Read
                  </span>
                </>
              }
            >
              <IncidentEvidencePanel
                detail={detail}
                selectedId={selectedEvidenceId}
                onSelect={selectEvidence}
                onPendingChange={setEvidencePending}
              />
            </ConsolePanel>

            <ConsolePanel
              title="timeline.log"
              count={String(detail.events.length)}
              accent="bg-emerald-400"
              className="lg:col-span-8"
              footer={
                <>
                  <span>
                    <span className="font-mono tabular-nums">{detail.events.length}</span> Events
                  </span>
                  <span className="ml-auto">
                    {detail.incident.summary ? 'Merged' : 'Not merged'}
                  </span>
                </>
              }
            >
              <IncidentTimeline
                detail={detail}
                highlightedEventIds={highlighted}
                onSelectEvidence={selectEvidence}
              />
            </ConsolePanel>
          </div>
        </TabsContent>

        <TabsContent value="postmortem" keepMounted className="flex flex-1 flex-col lg:min-h-0">
          <ConsolePanel
            title="postmortem.md"
            count={detail.events.length > 0 ? 'live' : '—'}
            accent="bg-amber-300"
            className="flex-1"
            footer={
              detail.analysis ? (
                <>
                  <span>
                    {detail.analysis.outcome === 'proposed' ? 'Cause proposed' : 'Inconclusive'}
                  </span>
                  <span className="ml-auto">
                    {detail.analysis.status === 'approved' ? (
                      'Approved'
                    ) : (
                      <span className="font-mono uppercase">{detail.analysis.confidence}</span>
                    )}
                  </span>
                </>
              ) : (
                <span>No analysis yet</span>
              )
            }
          >
            <IncidentAnalysisPanel
              detail={detail}
              onHighlightEvents={showEvents}
              onPendingChange={setAnalysisPending}
            />
          </ConsolePanel>
        </TabsContent>
      </ConsoleTabs>

      <PendingNavigationGuard when={evidencePending || analysisPending} />
    </div>
  )
}
