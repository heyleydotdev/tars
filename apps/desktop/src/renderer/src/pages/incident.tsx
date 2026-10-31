import { useState } from 'react'
import { ArrowLeftIcon } from 'lucide-react'
import { Link, useLoaderData, useParams } from 'react-router'

import type { IncidentLoaderData } from '../lib/loaders'
import ConsoleHeader from '../components/console-header'
import ConsolePanel from '../components/console-panel'
import IncidentAnalysisPanel from '../components/incident-analysis-panel'
import IncidentEvidencePanel from '../components/incident-evidence-panel'
import IncidentTimeline from '../components/incident-timeline'
import { useIncident } from '../lib/incident'

export default function Incident() {
  const initial = useLoaderData<IncidentLoaderData>()
  const { id } = useParams<{ id: string }>()
  const incident = useIncident(id ?? '', initial)
  const detail = incident.data ?? initial
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null)
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set())

  function highlightEvents(ids: Set<string>): void {
    setHighlighted(ids)

    const [first] = ids

    if (!first) return

    document
      .querySelector(`[data-event-id="${first}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  return (
    <div className="flex min-h-full flex-col lg:min-h-0 lg:flex-1">
      <ConsoleHeader
        title="incident"
        right={
          <div className="flex items-center gap-2">
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

      <div className="bg-border grid flex-1 grid-cols-1 gap-px lg:min-h-0 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden">
        <ConsolePanel
          title="evidence.in"
          count={String(detail.evidence.length)}
          accent="bg-sky-400"
          className="lg:col-span-4"
          footer={
            <>
              <span>{detail.evidence.length} evidence</span>
              <span className="ml-auto">
                {detail.evidence.filter((item) => item.status === 'ready').length} read
              </span>
            </>
          }
        >
          <IncidentEvidencePanel
            detail={detail}
            selectedId={selectedEvidenceId}
            onSelect={setSelectedEvidenceId}
          />
        </ConsolePanel>

        <ConsolePanel
          title="timeline.log"
          count={String(detail.events.length)}
          accent="bg-emerald-400"
          className="lg:col-span-4"
          footer={
            <>
              <span>{detail.events.length} events</span>
              <span className="ml-auto">{detail.incident.summary ? 'merged' : 'not merged'}</span>
            </>
          }
        >
          <IncidentTimeline
            detail={detail}
            selectedEvidenceId={selectedEvidenceId}
            highlightedEventIds={highlighted}
            onSelectEvidence={setSelectedEvidenceId}
          />
        </ConsolePanel>

        <ConsolePanel
          title="postmortem.md"
          count={detail.events.length > 0 ? 'live' : '—'}
          accent="bg-amber-300"
          className="lg:col-span-4"
          footer={
            detail.analysis ? (
              <>
                <span>
                  {detail.analysis.outcome === 'proposed' ? 'cause proposed' : 'inconclusive'}
                </span>
                <span className="ml-auto">
                  {detail.analysis.status === 'approved' ? 'approved' : detail.analysis.confidence}
                </span>
              </>
            ) : (
              <span>no analysis yet</span>
            )
          }
        >
          <IncidentAnalysisPanel detail={detail} onHighlightEvents={highlightEvents} />
        </ConsolePanel>
      </div>
    </div>
  )
}
