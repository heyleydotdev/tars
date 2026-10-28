import { useCallback, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { safeRedirect } from '@tars/core/utils/redirect'

export function useAuthSubmit(fallbackError: string) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  const submit = useCallback(
    async (action: () => Promise<void>): Promise<void> => {
      setError(null)

      try {
        await action()
        void navigate(safeRedirect(searchParams.get('redirectTo')), { replace: true })
      } catch (error) {
        setError(error instanceof Error ? error.message : fallbackError)
      }
    },
    [navigate, searchParams, fallbackError]
  )

  return { error, submit }
}
