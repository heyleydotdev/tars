export default function ConsoleHeader({
  title,
  children,
  right
}: React.PropsWithChildren<{ title: string; right: React.ReactNode }>) {
  return (
    <header className="border-border bg-background/95 sticky top-0 z-20 border-b backdrop-blur">
      <div className="flex min-h-11 flex-wrap items-center gap-x-5 gap-y-2 px-3 py-2 sm:px-4">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-emerald-400">&gt;</span>
          <span className="text-muted-foreground">tars</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-foreground">{title}</span>
          <span
            aria-hidden
            className="console-cursor ml-0.5 inline-block h-3 w-1.5 bg-emerald-400"
          />
        </div>

        <span aria-hidden className="bg-border hidden h-4 w-px sm:block" />

        {children}

        <div className="ml-auto flex flex-wrap items-center justify-end gap-3 text-xs">{right}</div>
      </div>
    </header>
  )
}
