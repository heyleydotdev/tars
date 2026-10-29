import { Button } from '@tars/ui/components/button'

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
      <div className="text-muted-foreground max-w-sm border p-5 text-xs">
        <p className="text-destructive">// {title}</p>
        <p className="text-muted-foreground mt-1">{detail}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-3 tracking-wide uppercase"
        >
          retry
        </Button>
      </div>
    </div>
  )
}
