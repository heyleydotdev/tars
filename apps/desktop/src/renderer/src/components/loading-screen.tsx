import { Spinner } from '@tars/ui/components/spinner'

export default function LoadingScreen() {
  return (
    <div className="bg-background flex h-svh items-center justify-center">
      <Spinner />
    </div>
  )
}
