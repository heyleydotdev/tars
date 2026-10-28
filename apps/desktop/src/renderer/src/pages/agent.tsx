import { SendIcon } from 'lucide-react'

import { Button } from '@tars/ui/components/button'
import { Textarea } from '@tars/ui/components/textarea'

import DashboardShell from '../components/dashboard-shell'

export default function Agent() {
  return (
    <DashboardShell>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-scroll p-4">
          <SayHello />
        </div>
        <div className="bg-sidebar flex shrink-0 items-end gap-2 border-t p-3">
          <Textarea
            placeholder="Message Agent…"
            className="max-h-56 min-h-9 resize-none"
            rows={1}
            aria-label="Message Agent"
          />
          <Button type="button" size="icon" className="size-9 border" aria-label="Send message">
            <SendIcon />
          </Button>
        </div>
      </div>
    </DashboardShell>
  )
}

function SayHello() {
  return (
    <div className="flex size-full items-center justify-center text-center">
      <h1 className="text-4xl font-bold tracking-tighter">Say Hello!</h1>
    </div>
  )
}
