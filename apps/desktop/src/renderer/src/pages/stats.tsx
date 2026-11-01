import { useEffect, useMemo } from 'react'
import { useLoaderData } from 'react-router'

import type { ExpenseItemOutput } from '@tars/core/schemas/expenses'
import type {
  JournalPageOutput,
  ReminderItemOutput,
  TodoItemOutput
} from '@tars/core/schemas/journal'
import { ERRORS } from '@tars/core/errors'
import { toDateKey } from '@tars/core/utils/format'

import type { StatsLoaderData } from '../lib/loaders'
import ConsoleEnd from '../components/console-end'
import ConsoleHeader from '../components/console-header'
import StatsCategoryChart from '../components/stats-category-chart'
import StatsHeatmap from '../components/stats-heatmap'
import StatsPanel from '../components/stats-panel'
import StatsProgress from '../components/stats-progress'
import StatsRecent from '../components/stats-recent'
import StatsSpendChart from '../components/stats-spend-chart'
import { summarizeCategories, useExpenses } from '../lib/expenses'
import { useJournal } from '../lib/journal'
import {
  buildActivity,
  buildMonthlySpend,
  buildRecentActivity,
  countRecordStates,
  dominantCurrency
} from '../lib/stats'
import { useShellAlertStore } from '../stores/alert'

const EMPTY_TODOS: JournalPageOutput['todos'] = []
const EMPTY_REMINDERS: JournalPageOutput['reminders'] = []
const EMPTY_JOURNALS: JournalPageOutput['journals'] = []
const EMPTY_EXPENSES: Array<ExpenseItemOutput> = []

export default function Stats() {
  const initial = useLoaderData<StatsLoaderData>()
  const journal = useJournal(initial.journal)
  const expenses = useExpenses(initial.expenses)
  const showAlert = useShellAlertStore((state) => state.showAlert)
  const todos: Array<TodoItemOutput> = journal.data?.todos ?? EMPTY_TODOS
  const reminders: Array<ReminderItemOutput> = journal.data?.reminders ?? EMPTY_REMINDERS
  const journals = journal.data?.journals ?? EMPTY_JOURNALS
  const items = expenses.data?.items ?? EMPTY_EXPENSES
  const currency = useMemo(() => dominantCurrency(items), [items])
  const currencyItems = useMemo(
    () => items.filter((item) => item.currency === currency),
    [currency, items]
  )
  const spend = useMemo(() => buildMonthlySpend(currencyItems), [currencyItems])
  const categories = useMemo(() => summarizeCategories(currencyItems), [currencyItems])
  const categoryTotal = useMemo(
    () => categories.reduce((total, category) => total + category.amountCents, 0),
    [categories]
  )
  const records = useMemo(
    () => ({ journals, todos, reminders, expenses: items }),
    [items, journals, reminders, todos]
  )
  const activity = useMemo(() => buildActivity(records, 26), [records])
  const recent = useMemo(() => buildRecentActivity(records), [records])
  const { openTasks, doneTasks, pendingReminders, sentReminders, dismissedReminders } = useMemo(
    () => countRecordStates(todos, reminders),
    [reminders, todos]
  )
  useEffect(() => {
    const stale = (journal.isError && journal.data) || (expenses.isError && expenses.data)

    if (!stale) return

    showAlert({
      title: ERRORS.refreshFailed,
      description: ERRORS.lastLoadedStats,
      variant: 'destructive'
    })
  }, [expenses.data, expenses.isError, journal.data, journal.isError, showAlert])

  return (
    <div className="flex min-h-full flex-col">
      <ConsoleHeader
        title="stats"
        right={
          <span className="text-muted-foreground font-mono tabular-nums">
            {toDateKey(new Date())}
          </span>
        }
      />

      <div className="bg-border grid flex-1 grid-cols-1 gap-px lg:grid-cols-3">
        <StatsPanel
          title="activity.map"
          count={String(activity.total)}
          accent="bg-emerald-400"
          className="lg:col-span-2"
        >
          <StatsHeatmap activity={activity} />
        </StatsPanel>

        <StatsPanel
          title="category.split"
          count={String(categories.length)}
          accent="bg-sky-400"
          className="lg:col-span-1"
        >
          <StatsCategoryChart
            categories={categories}
            totalCents={categoryTotal}
            currency={currency}
          />
        </StatsPanel>

        <StatsPanel
          title="spend.trend"
          count={currency}
          accent="bg-emerald-400"
          className="lg:col-span-2"
        >
          <StatsSpendChart
            points={spend.points}
            totalCents={spend.totalCents}
            maxCents={spend.maxCents}
            currency={currency}
          />
        </StatsPanel>

        <StatsPanel
          title="task.ratio"
          count={String(todos.length)}
          accent="bg-violet-400"
          className="lg:col-span-1"
        >
          <StatsProgress
            openTasks={openTasks}
            doneTasks={doneTasks}
            pendingReminders={pendingReminders}
            sentReminders={sentReminders}
            dismissedReminders={dismissedReminders}
          />
        </StatsPanel>

        <StatsPanel
          title="activity.log"
          count={String(recent.length)}
          accent="bg-sky-400"
          className="lg:col-span-3"
        >
          <StatsRecent events={recent} />
        </StatsPanel>
      </div>
      <ConsoleEnd />
    </div>
  )
}
