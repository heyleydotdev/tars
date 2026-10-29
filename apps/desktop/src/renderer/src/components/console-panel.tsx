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
      <header className="border-border bg-muted/10 flex h-9 shrink-0 items-center gap-2 border-b px-3">
        <span aria-hidden className={cn('size-1.5 rounded-full', accent)} />
        <h2 className="text-foreground text-xs tracking-wide">{title}</h2>
        {count ? (
          <span className="text-muted-foreground text-xs tabular-nums">[{count}]</span>
        ) : null}
        <span aria-hidden className="bg-border ml-auto h-px w-8" />
      </header>
      <div className="console-scroll min-h-0 flex-1 lg:overflow-y-auto">{children}</div>
    </section>
  )
}

export function ConsoleEmpty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="text-muted-foreground flex h-full min-h-40 flex-col items-center justify-center gap-1 p-6 text-center text-xs">
      <p className="text-muted-foreground">// {title}</p>
      <p>{hint}</p>
    </div>
  )
}
