import { useState } from 'react'
import { BugIcon } from 'lucide-react'

import { Button } from '@tars/ui/components/button'

export default function ErrorTestButton() {
  const [fail, setFail] = useState(false)

  if (fail) throw new Error('Test error screen')

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      aria-label="Test error screen"
      title="Test error screen"
      onClick={() => setFail(true)}
    >
      <BugIcon />
    </Button>
  )
}
