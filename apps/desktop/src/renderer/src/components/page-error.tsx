export default function PageError({
  title = 'failed to load records',
  detail = 'the worker may be offline.',
  onRetry
}: {
  title?: string
  detail?: string
  onRetry: () => void
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="border-border text-muted-foreground max-w-sm border p-5 text-xs">
        <p className="text-destructive">// {title}</p>
        <p className="text-muted-foreground mt-1">{detail}</p>
        <button
          type="button"
          onClick={onRetry}
          className="border-border text-foreground hover:bg-muted/40 focus-visible:ring-ring mt-3 border px-2 py-1 text-xs tracking-wide uppercase transition-colors focus-visible:ring-1 focus-visible:outline-none"
        >
          retry
        </button>
      </div>
    </div>
  )
}
