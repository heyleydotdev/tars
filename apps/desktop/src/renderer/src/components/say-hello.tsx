import { BotIcon } from 'lucide-react'

import EmptyState from './empty-state'

export default function SayHello() {
  return <EmptyState title="Say Hello, TARS!" hint="Ask anything to get started." icon={BotIcon} />
}
