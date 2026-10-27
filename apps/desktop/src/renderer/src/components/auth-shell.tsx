export default function AuthShell({ children }: React.PropsWithChildren) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-2">
      <aside className="bg-sidebar text-sidebar-foreground hidden flex-col justify-between p-10 lg:flex">
        <div className="flex items-center gap-3">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 items-center justify-center rounded-lg text-xs font-semibold">
            TA
          </div>
          <span className="font-heading text-sm font-semibold tracking-[0.18em]">TARS</span>
        </div>
        <div className="flex max-w-sm flex-col gap-3">
          <h2 className="font-heading text-3xl font-semibold tracking-tight">Welcome to TARS.</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Sign in or create an account to continue.
          </p>
        </div>
        <p className="text-muted-foreground text-xs">© {new Date().getFullYear()} TARS</p>
      </aside>
      <main className="flex min-h-0 items-center justify-center overflow-auto p-6">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  )
}
