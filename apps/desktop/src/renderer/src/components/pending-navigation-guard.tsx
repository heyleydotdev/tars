import { useBlocker } from 'react-router'

import { ERRORS } from '@tars/core/errors'

import ConfirmDialog from './confirm-dialog'

export default function PendingNavigationGuard({ when }: { when: boolean }) {
  const blocker = useBlocker(when)

  return (
    <ConfirmDialog
      title={ERRORS.pendingNavigationTitle}
      description={ERRORS.pendingNavigationDescription}
      confirmLabel="Leave"
      open={blocker.state === 'blocked'}
      pending={false}
      onOpenChange={(open) => {
        if (!open && blocker.state === 'blocked') blocker.reset()
      }}
      onConfirm={() => {
        if (blocker.state === 'blocked') blocker.proceed()
      }}
    />
  )
}
