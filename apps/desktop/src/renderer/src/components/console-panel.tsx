import { cn } from '@tars/ui/lib/utils'

export default function ConsolePanel({
  title,
  count,
  accent,
  className,
  children
}: React.PropsWithChildren<{
  title: string
  count?: string
  accent: string
  className?: string
}>) {
  return (
    <section className={cn('bg-background flex min-h-0 flex-col lg:h-auto', className)}>
      <header className="bg-muted/10 flex h-9 shrink-0 items-center gap-2 border-b px-3">
        <span aria-hidden className={cn('size-1.5', accent)} />
        <h2 className="text-foreground font-mono text-xs tracking-wide">{title}</h2>
        {count ? (
          <span className="text-muted-foreground font-mono text-xs tabular-nums">[{count}]</span>
        ) : null}
        <span aria-hidden className="bg-border ml-auto h-px w-8" />
      </header>
      <div className="console-scroll min-h-0 flex-1 lg:overflow-y-auto">{children}</div>
    </section>
  )
}
