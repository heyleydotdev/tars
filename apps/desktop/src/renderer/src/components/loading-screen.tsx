import { Spinner } from '@tars/ui/components/spinner'

export default function LoadingScreen() {
  return (
    <div className="bg-background flex items-center justify-center">
      <Spinner />
    </div>
  )
}
