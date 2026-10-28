import { Button } from '@tars/ui/components/button'

export function FormFooter({
  prompt,
  action,
  onAction
}: {
  prompt: string
  action: string
  onAction: () => void
}) {
  return (
    <p className="text-muted-foreground text-center text-sm">
      {prompt}{' '}
      <Button type="button" variant="link" className="h-auto p-0" onClick={onAction}>
        {action}
      </Button>
    </p>
  )
}
