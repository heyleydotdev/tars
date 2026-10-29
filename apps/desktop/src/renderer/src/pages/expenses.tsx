import { useMemo, useState } from 'react'

import type { ExpenseListOutput } from '@tars/core/schemas/expenses'
import { formatCurrency, startOfMonth, toDateKey, toMonthKey } from '@tars/core/utils/format'

import ConsolePanel from '../components/console-panel'
import DashboardShell from '../components/dashboard-shell'
import ExpensesBreakdown from '../components/expenses-breakdown'
import ExpensesCalendar from '../components/expenses-calendar'
import ExpensesLedger from '../components/expenses-ledger'
import ExpensesStats from '../components/expenses-stats'
import LoadingScreen from '../components/loading-screen'
import PageError from '../components/page-error'
import { expenseAt, sumExpenses, summarizeCategories, useExpenses } from '../lib/expenses'

const EMPTY_EXPENSES: ExpenseListOutput['items'] = []

export default function Expenses() {
  const expenses = useExpenses()
  const items = expenses.data?.items ?? EMPTY_EXPENSES
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [currency, setCurrency] = useState<string | null>(null)
  const monthKey = toMonthKey(month)

  const { currencies, monthCurrency } = useMemo(() => {
    const counts = new Map<string, number>()
    const monthCounts = new Map<string, number>()

    for (const item of items) {
      counts.set(item.currency, (counts.get(item.currency) ?? 0) + 1)

      if (toMonthKey(expenseAt(item)) === monthKey) {
        monthCounts.set(item.currency, (monthCounts.get(item.currency) ?? 0) + 1)
      }
    }

    return {
      currencies: [...counts.entries()]
        .sort((left, right) => right[1] - left[1])
        .map(([code]) => code),
      monthCurrency:
        [...monthCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null
    }
  }, [items, monthKey])

  const activeCurrency =
    currency && currencies.includes(currency) ? currency : (monthCurrency ?? currencies[0] ?? 'USD')

  const { monthItems, dailyTotals } = useMemo(() => {
    const monthItems: ExpenseListOutput['items'] = []
    const dailyTotals = new Map<string, number>()

    for (const item of items) {
      if (item.currency !== activeCurrency) continue
      if (toMonthKey(expenseAt(item)) !== monthKey) continue

      monthItems.push(item)

      const key = toDateKey(expenseAt(item))
      dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + item.amountCents)
    }

    return { monthItems, dailyTotals }
  }, [activeCurrency, items, monthKey])

  const { periodItems, totalCents, categories } = useMemo(() => {
    const selectedKey = selectedDay ? toDateKey(selectedDay) : null
    const periodItems = selectedKey
      ? monthItems.filter((item) => toDateKey(expenseAt(item)) === selectedKey)
      : monthItems

    return {
      periodItems,
      totalCents: sumExpenses(periodItems),
      categories: summarizeCategories(periodItems)
    }
  }, [monthItems, selectedDay])

  const entries = periodItems.length
  const averageCents = entries > 0 ? Math.round(totalCents / entries) : 0
  const topCategory =
    categories.find((category) => category.label.toLowerCase() !== 'uncategorized')?.label ?? '—'
  const daysWithSpend = dailyTotals.size

  function selectDay(date: Date) {
    const key = toDateKey(date)

    setMonth((current) => (toMonthKey(current) === toMonthKey(date) ? current : startOfMonth(date)))
    setSelectedDay((current) => (current && toDateKey(current) === key ? null : date))
  }

  function changeMonth(next: Date) {
    setMonth(next)
    setSelectedDay(null)
  }

  function goToday() {
    const today = new Date()

    setMonth((current) =>
      toMonthKey(current) === toMonthKey(today) ? current : startOfMonth(today)
    )
    setSelectedDay(today)
  }

  return (
    <DashboardShell>
      {expenses.isPending ? (
        <LoadingScreen />
      ) : (
        <div className="flex min-h-full flex-col font-mono lg:h-full lg:min-h-0 lg:overflow-hidden">
          <ExpensesStats
            period={selectedDay ? 'day' : 'month'}
            total={formatCurrency(totalCents, activeCurrency)}
            entries={entries}
            average={formatCurrency(averageCents, activeCurrency)}
            top={topCategory}
            month={monthKey.replace('-', '.')}
            currency={activeCurrency}
            currencies={currencies}
            onCurrencyChange={(next) => {
              setCurrency(next)
              setSelectedDay(null)
            }}
          />

          {expenses.isError && !expenses.data ? (
            <PageError title="failed to load expenses" onRetry={() => void expenses.refetch()} />
          ) : (
            <div className="bg-border grid flex-1 grid-cols-1 gap-px lg:min-h-0 lg:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]">
              <ConsolePanel
                title="ledger.log"
                count={String(periodItems.length)}
                accent="bg-emerald-400"
              >
                <ExpensesLedger
                  items={periodItems}
                  currency={activeCurrency}
                  selectedDay={selectedDay}
                  onClearDay={() => setSelectedDay(null)}
                />
              </ConsolePanel>

              <div className="bg-border flex flex-col gap-px lg:min-h-0">
                <ConsolePanel
                  title="spend.cal"
                  count={String(daysWithSpend)}
                  accent="bg-amber-400"
                  className="lg:flex-none"
                >
                  <ExpensesCalendar
                    month={month}
                    selected={selectedDay}
                    dailyTotals={dailyTotals}
                    currency={activeCurrency}
                    onMonthChange={changeMonth}
                    onSelect={selectDay}
                    onToday={goToday}
                  />
                </ConsolePanel>

                <ConsolePanel
                  title="breakdown.cat"
                  count={String(categories.length)}
                  accent="bg-sky-400"
                  className="lg:min-h-0 lg:flex-1"
                >
                  <ExpensesBreakdown
                    categories={categories}
                    totalCents={totalCents}
                    currency={activeCurrency}
                  />
                </ConsolePanel>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  )
}
