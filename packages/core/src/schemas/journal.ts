import * as z from 'zod'

import { DESK_PRIORITIES } from '../constants'

export const todoItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean(),
  dueAt: z.string().nullable(),
  priority: z.enum(DESK_PRIORITIES).nullable(),
  createdAt: z.string()
})

export const reminderItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  remindAt: z.string(),
  status: z.enum(['pending', 'sent', 'dismissed']),
  createdAt: z.string()
})

export const journalItemSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  content: z.string(),
  mood: z.string().nullable(),
  tags: z.array(z.string()),
  occurredAt: z.string().nullable(),
  createdAt: z.string()
})

export const journalPageSchema = z.object({
  todos: z.array(todoItemSchema),
  reminders: z.array(reminderItemSchema),
  journals: z.array(journalItemSchema)
})

export const recordDoneSchema = z.object({
  id: z.string().min(1),
  done: z.boolean()
})

export type TodoItemInput = z.input<typeof todoItemSchema>
export type TodoItemOutput = z.output<typeof todoItemSchema>
export type ReminderItemInput = z.input<typeof reminderItemSchema>
export type ReminderItemOutput = z.output<typeof reminderItemSchema>
export type JournalItemInput = z.input<typeof journalItemSchema>
export type JournalItemOutput = z.output<typeof journalItemSchema>
export type JournalPageInput = z.input<typeof journalPageSchema>
export type JournalPageOutput = z.output<typeof journalPageSchema>
export type RecordDoneInput = z.input<typeof recordDoneSchema>
export type RecordDoneOutput = z.output<typeof recordDoneSchema>
