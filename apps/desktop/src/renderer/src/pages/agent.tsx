import AgentComposer from '../components/agent-composer'
import DashboardShell from '../components/dashboard-shell'
import SayHello from '../components/say-hello'

export default function Agent() {
  return (
    <DashboardShell>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-scroll p-4">
          <SayHello />
        </div>
        <AgentComposer />
      </div>
    </DashboardShell>
  )
}
