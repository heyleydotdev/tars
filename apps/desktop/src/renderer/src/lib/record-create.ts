import type { ZodError } from 'zod'

import type {
  CreateJournalInput,
  CreateReminderInput,
  CreateTodoInput
} from '@tars/core/schemas/journal'
import { ERRORS } from '@tars/core/errors'
import {
  createJournalSchema,
  createReminderSchema,
  createTodoSchema
} from '@tars/core/schemas/journal'
import { fromDateTimeLocal, fromDateTimeLocalRequired } from '@tars/core/utils/format'
import { parseTagList } from '@tars/core/utils/journal'

export type RecordType = 'note' | 'todo' | 'reminder'

export type RecordDraft = {
  title: string
  content: string
  mood: string
  tags: string
  at: string
  dueAt: string
}

export type RecordInput =
  | { type: 'note'; input: CreateJournalInput }
  | { type: 'todo'; input: CreateTodoInput }
  | { type: 'reminder'; input: CreateReminderInput }

function firstIssue(error: ZodError): string {
  return error.issues[0]?.message ?? ERRORS.saveFailed
}

// Turns the one dialog into the right record, validating with the same schemas
// the server uses so the client cannot send something the route would reject.
export function buildRecordInput(type: RecordType, draft: RecordDraft): RecordInput {
  if (type === 'note') {
    const parsed = createJournalSchema.safeParse({
      title: draft.title.trim() || null,
      content: draft.content.trim(),
      mood: draft.mood.trim() || null,
      tags: parseTagList(draft.tags),
      occurredAt: fromDateTimeLocalRequired(draft.at)
    })

    if (!parsed.success) throw new Error(firstIssue(parsed.error))

    return { type, input: parsed.data }
  }

  if (type === 'todo') {
    const parsed = createTodoSchema.safeParse({
      title: draft.title.trim(),
      dueAt: fromDateTimeLocal(draft.dueAt)
    })

    if (!parsed.success) throw new Error(firstIssue(parsed.error))

    return { type, input: parsed.data }
  }

  const parsed = createReminderSchema.safeParse({
    title: draft.title.trim(),
    remindAt: fromDateTimeLocalRequired(draft.at)
  })

  if (!parsed.success) throw new Error(firstIssue(parsed.error))

  return { type, input: parsed.data }
}
