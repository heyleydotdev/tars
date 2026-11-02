import type { ActionActivityAction } from '@tars/core/schemas/journal'

import { orpc } from './orpc'

export function logAction(
  action: ActionActivityAction,
  entityId: string,
  title: string,
  detail: string | null = null
): void {
  void orpc.journal.logActivity
    .call({
      events: [
        {
          type: 'action',
          action,
          entityId,
          title,
          detail,
          occurredAt: new Date().toISOString()
        }
      ]
    })
    .catch(() => undefined)
}
