import * as z from 'zod'

import { DESK_PRIORITIES } from '../constants'
import { ERRORS } from '../errors'

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
  occurredAt: z.string().min(1)
})

export const journalPageSchema = z.object({
  todos: z.array(todoItemSchema),
  reminders: z.array(reminderItemSchema),
  journals: z.array(journalItemSchema)
})

export const updateTodoSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1, ERRORS.titleRequired),
  dueAt: z.iso.datetime({ offset: true, error: ERRORS.dateInvalid }).nullable(),
  priority: z.enum(DESK_PRIORITIES).nullable()
})

export const updateReminderSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1, ERRORS.titleRequired),
  remindAt: z.iso.datetime({ offset: true, error: ERRORS.dateInvalid })
})

export const updateJournalSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1, ERRORS.titleRequired).nullable(),
  content: z.string().trim().min(1, ERRORS.contentRequired),
  mood: z.string().trim().min(1, ERRORS.titleRequired).nullable(),
  tags: z.array(z.string().trim().min(1, ERRORS.tagRequired)),
  occurredAt: z.iso.datetime({ offset: true, error: ERRORS.dateInvalid })
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
export type UpdateTodoInput = z.input<typeof updateTodoSchema>
export type UpdateTodoOutput = z.output<typeof updateTodoSchema>
export type UpdateReminderInput = z.input<typeof updateReminderSchema>
export type UpdateReminderOutput = z.output<typeof updateReminderSchema>
export type UpdateJournalInput = z.input<typeof updateJournalSchema>
export type UpdateJournalOutput = z.output<typeof updateJournalSchema>
export type RecordDoneInput = z.input<typeof recordDoneSchema>
export type RecordDoneOutput = z.output<typeof recordDoneSchema>
