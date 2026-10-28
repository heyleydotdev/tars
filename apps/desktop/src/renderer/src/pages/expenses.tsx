import DashboardShell from '../components/dashboard-shell'

export default function Expenses() {
  return (
    <DashboardShell>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <p className="text-muted-foreground text-sm">Expenses</p>
      </div>
    </DashboardShell>
  )
}
