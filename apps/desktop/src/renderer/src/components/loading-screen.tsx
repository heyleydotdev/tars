import { Spinner } from '@tars/ui/components/spinner'

export default function LoadingScreen() {
  return (
    <div className="bg-background flex h-full min-h-0 flex-1 items-center justify-center">
      <Spinner className="text-muted-foreground size-5" />
    </div>
  )
}
