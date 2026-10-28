import AgentComposer from '../components/agent-composer'
import ChatArea from '../components/chat-area'
import DashboardShell from '../components/dashboard-shell'

export default function Agent() {
  return (
    <DashboardShell>
      <div className="flex min-h-0 flex-1 flex-col">
        <ChatArea />
        <AgentComposer />
      </div>
    </DashboardShell>
  )
}
