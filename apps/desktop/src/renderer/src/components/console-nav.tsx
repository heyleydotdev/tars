import { Link, useLocation } from 'react-router'

import { cn } from '@tars/ui/lib/utils'

export default function ConsoleNav({ items }: { items: Array<{ label: string; to: string }> }) {
  const { pathname } = useLocation()

  return (
    <nav className="bg-background flex shrink-0 border-b">
      {items.map((item) => {
        const active = item.to === pathname

        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex h-10 shrink-0 items-center border-r px-4 text-xs tracking-wide transition-colors',
              active
                ? 'text-foreground bg-muted/30'
                : 'text-muted-foreground hover:bg-muted/20 hover:text-foreground'
            )}
          >
            {item.label}
            {active ? (
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-emerald-400" />
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}
