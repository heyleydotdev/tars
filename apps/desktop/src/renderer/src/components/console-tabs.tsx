import { Link } from 'react-router'

import { cn } from '@tars/ui/lib/utils'

type ConsoleTabItem = {
  value: string
  label: string
  count?: number | string
  to?: string
}

export default function ConsoleTabs({
  value,
  onValueChange,
  items
}: {
  value: string
  onValueChange?: (value: string) => void
  items: Array<ConsoleTabItem>
}) {
  return (
    <nav aria-label="Sections" className="bg-background flex shrink-0 overflow-x-auto border-b">
      {items.map((item) => {
        const active = item.value === value
        const className = cn(
          'relative flex h-10 shrink-0 items-center gap-2 border-r px-4 font-mono text-xs tracking-wide transition-colors',
          active
            ? 'bg-muted/30 text-foreground'
            : 'text-muted-foreground hover:bg-muted/20 hover:text-foreground'
        )
        const content = (
          <>
            {item.label}
            {item.count !== undefined ? (
              <span className="text-muted-foreground tabular-nums">[{item.count}]</span>
            ) : null}
            {active ? (
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-emerald-400" />
            ) : null}
          </>
        )

        if (item.to) {
          return (
            <Link
              key={item.value}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={className}
            >
              {content}
            </Link>
          )
        }

        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            onClick={() => onValueChange?.(item.value)}
            className={className}
          >
            {content}
          </button>
        )
      })}
    </nav>
  )
}
