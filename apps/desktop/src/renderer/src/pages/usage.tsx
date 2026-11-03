import { useState } from 'react'

import type { UsageEventOutput } from '@tars/core/schemas/usage'
import { formatUsdMicros, toDateKey } from '@tars/core/utils/format'
import { Badge } from '@tars/ui/components/badge'
import { Spinner } from '@tars/ui/components/spinner'
import { Table, TableBody, TableCell, TableRow } from '@tars/ui/components/table'

import ConsoleDayHeader from '../components/console-day-header'
import ConsoleHeader from '../components/console-header'
import ConsolePanel from '../components/console-panel'
import EmptyState from '../components/empty-state'
import UsageEventDialog from '../components/usage-event-dialog'
import { USAGE_FEATURE_TONES } from '../lib/badge-tones'
import { groupByDay } from '../lib/group-by-day'
import { useUsage } from '../lib/usage'

export default function Usage() {
  const usage = useUsage()
  const data = usage.data
  const [selected, setSelected] = useState<UsageEventOutput | null>(null)
  const groups = data ? groupByDay(data.events, (event) => toDateKey(event.createdAt)) : []
  const stats = data
    ? [
        { label: 'Remaining', value: formatUsdMicros(data.remainingMicros) },
        { label: 'Calls', value: data.calls.toLocaleString() },
        { label: 'Input tokens', value: data.inputTokens.toLocaleString() },
        { label: 'Output tokens', value: data.outputTokens.toLocaleString() }
      ]
    : []

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <ConsoleHeader title="usage" />

      {usage.isPending ? (
        <div className="text-muted-foreground flex items-center gap-2 p-4 text-xs">
          <Spinner className="size-3.5" />
          Loading usage…
        </div>
      ) : !data ? (
        <p className="text-destructive p-4 text-xs">Could not load usage. Try again.</p>
      ) : (
        <div className="bg-border grid flex-1 grid-cols-1 gap-px lg:min-h-0 lg:grid-cols-12">
          <ConsolePanel
            title="usage.stats"
            count={String(data.calls)}
            accent="bg-emerald-400"
            className="lg:col-span-4"
          >
            <div className="space-y-3 p-3">
              <div>
                <p className="text-muted-foreground text-xs uppercase">Spent</p>
                <p className="text-foreground font-mono text-2xl tabular-nums">
                  {formatUsdMicros(data.spentMicros)}
                </p>
                <p className="text-muted-foreground text-xs">
                  of {formatUsdMicros(data.limitMicros)} free
                </p>
              </div>
              <Table className="border-border border">
                <TableBody>
                  {stats.map((row) => (
                    <TableRow key={row.label}>
                      <TableCell className="text-muted-foreground">{row.label}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {row.value}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.models.length > 0 ? (
                <div className="border-border space-y-2 border-t pt-3">
                  <p className="text-muted-foreground text-xs uppercase">By model</p>
                  <Table className="border-border border">
                    <TableBody>
                      {data.models.map((row) => (
                        <TableRow key={row.model}>
                          <TableCell className="font-mono">{row.model}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {row.calls.toLocaleString()} · {formatUsdMicros(row.costMicros)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </div>
          </ConsolePanel>

          <ConsolePanel
            title="usage.log"
            count={String(data.events.length)}
            accent="bg-sky-400"
            className="lg:col-span-8"
          >
            {data.events.length === 0 ? (
              <EmptyState title="No Usage Yet" hint="Every AI call is recorded here." />
            ) : (
              groups.map((group) => (
                <section key={group.key}>
                  <ConsoleDayHeader label={group.label} count={group.items.length} unit="call" />
                  <ul className="divide-border divide-y">
                    {group.items.map((event) => (
                      <li key={event.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(event)}
                          className="hover:bg-muted/60 flex w-full items-center gap-3 px-3 py-2 text-left text-xs/6 transition-colors"
                        >
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            <Badge
                              variant="default"
                              className={`capitalize ${USAGE_FEATURE_TONES[event.feature] ?? 'bg-muted text-muted-foreground'}`}
                            >
                              {event.feature}
                            </Badge>
                            <span className="text-muted-foreground truncate">{event.model}</span>
                          </span>
                          <span className="text-foreground shrink-0 font-mono tabular-nums">
                            {formatUsdMicros(event.costMicros)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}
          </ConsolePanel>
        </div>
      )}

      <UsageEventDialog
        event={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      />
    </div>
  )
}
