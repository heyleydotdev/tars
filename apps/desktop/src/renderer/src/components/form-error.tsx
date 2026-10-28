import { Alert, AlertDescription } from '@tars/ui/components/alert'

export function FormError({ message }: { message: string | null }) {
  return message ? (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  ) : null
}
