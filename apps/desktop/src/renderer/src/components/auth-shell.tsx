import authCover from '../assets/auth-cover.jpg'

export default function AuthShell({ children }: React.PropsWithChildren) {
  return (
    <div className="bg-background flex flex-col overflow-hidden">
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-2">
        <aside
          className="relative hidden flex-col justify-between bg-cover bg-center p-10 lg:flex"
          style={{ backgroundImage: `url(${authCover})` }}
        >
          <div aria-hidden className="absolute inset-0 bg-black/45" />
          <div className="relative flex items-center gap-3">
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 items-center justify-center text-sm font-semibold">
              TA
            </div>
            <span className="font-heading text-sm font-semibold tracking-[0.18em] text-white">
              TARS
            </span>
          </div>
          <p className="relative text-xs text-white/70">© {new Date().getFullYear()} TARS</p>
        </aside>
        <main className="flex min-h-0 items-center justify-center overflow-auto p-6">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>
    </div>
  )
}
