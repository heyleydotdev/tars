import AgentComposer from './agent-composer'
import ChatArea from './chat-area'

export default function DeskChat() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatArea />
      <AgentComposer />
    </div>
  )
}
