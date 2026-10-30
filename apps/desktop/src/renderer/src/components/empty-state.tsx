import type { LucideIcon } from 'lucide-react'
import { InboxIcon } from 'lucide-react'

export default function EmptyState({
  title,
  hint,
  icon: Icon = InboxIcon
}: {
  title: string
  hint: string
  icon?: LucideIcon
}) {
  return (
    <div className="text-muted-foreground flex h-full min-h-40 flex-col items-center justify-center gap-3 p-6 text-center font-sans">
      <div className="bg-muted flex size-10 items-center justify-center">
        <Icon className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="text-foreground text-sm font-medium">{title}</p>
        <p className="text-xs">{hint}</p>
      </div>
    </div>
  )
}
