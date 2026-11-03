import * as z from 'zod'

import { ERRORS } from '../errors'

export const todoItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean(),
  dueAt: z.string().nullable(),
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
  dueAt: z.iso.datetime({ offset: true, error: ERRORS.dateInvalid }).nullable()
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

export const createJournalSchema = updateJournalSchema.omit({ id: true })
export const createTodoSchema = updateTodoSchema.omit({ id: true })
export const createReminderSchema = updateReminderSchema.omit({ id: true })

export const recordDoneSchema = z.object({
  id: z.string().min(1),
  done: z.boolean()
})

const activityDayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const activityOccurredAt = z.iso.datetime({ offset: true, error: ERRORS.dateInvalid })

export const taskDoneActivitySchema = z.object({
  type: z.literal('task.done'),
  todoId: z.string().min(1),
  title: z.string().min(1),
  dayKey: activityDayKey,
  occurredAt: activityOccurredAt
})

export const incidentOpenedActivitySchema = z.object({
  type: z.literal('incident.opened'),
  incidentId: z.string().min(1),
  title: z.string().min(1),
  occurredAt: activityOccurredAt
})

export const incidentApprovedActivitySchema = z.object({
  type: z.literal('incident.approved'),
  incidentId: z.string().min(1),
  title: z.string().min(1),
  occurredAt: activityOccurredAt
})

export const measureCompletedActivitySchema = z.object({
  type: z.literal('measure.completed'),
  runId: z.string().min(1),
  photoCount: z.number().int().positive(),
  objectCount: z.number().int().nonnegative(),
  occurredAt: activityOccurredAt
})

export const actionActivityActionSchema = z.enum([
  'incident.deleted',
  'incident.evidence.added',
  'incident.evidence.removed',
  'incident.rootcause',
  'incident.answered',
  'incident.time.fixed',
  'incident.timeline.rebuilt',
  'blueprint.created',
  'blueprint.deleted',
  'blueprint.evidence.added',
  'blueprint.evidence.removed',
  'blueprint.mapped',
  'blueprint.gaps',
  'blueprint.answered',
  'blueprint.requirement.toggled',
  'blueprint.requirement.removed',
  'blueprint.drafted',
  'blueprint.hierarchy',
  'blueprint.flow',
  'measure.deleted',
  'ui.created',
  'ui.explained',
  'ui.redesign',
  'ui.deleted',
  'task.updated',
  'task.deleted',
  'reminder.updated',
  'reminder.done',
  'reminder.deleted',
  'expense.updated',
  'expense.deleted'
])

export const actionActivitySchema = z.object({
  type: z.literal('action'),
  action: actionActivityActionSchema,
  entityId: z.string().min(1),
  title: z.string().min(1),
  detail: z.string().nullable(),
  occurredAt: activityOccurredAt
})

export const activityEventSchema = z.discriminatedUnion('type', [
  taskDoneActivitySchema,
  incidentOpenedActivitySchema,
  incidentApprovedActivitySchema,
  measureCompletedActivitySchema,
  actionActivitySchema
])

export const logActivitySchema = z.object({
  events: z.array(activityEventSchema).min(1).max(50)
})

export const removeTaskActivitySchema = z.object({
  todoId: z.string().min(1)
})

export const removeReminderActivitySchema = z.object({
  reminderId: z.string().min(1)
})

export const journalNotesPageSchema = z.object({
  items: z.array(journalItemSchema)
})

export const journalActivitySchema = z.object({
  from: z.iso.datetime({ offset: true, error: ERRORS.dateInvalid }),
  to: z.iso.datetime({ offset: true, error: ERRORS.dateInvalid })
})

export const journalActivityPageSchema = z.object({
  items: z.array(journalItemSchema)
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
export type CreateTodoInput = z.input<typeof createTodoSchema>
export type CreateTodoOutput = z.output<typeof createTodoSchema>
export type CreateReminderInput = z.input<typeof createReminderSchema>
export type CreateReminderOutput = z.output<typeof createReminderSchema>
export type CreateJournalInput = z.input<typeof createJournalSchema>
export type CreateJournalOutput = z.output<typeof createJournalSchema>
export type UpdateJournalInput = z.input<typeof updateJournalSchema>
export type UpdateJournalOutput = z.output<typeof updateJournalSchema>
export type RecordDoneInput = z.input<typeof recordDoneSchema>
export type RecordDoneOutput = z.output<typeof recordDoneSchema>
export type TaskDoneActivityInput = z.input<typeof taskDoneActivitySchema>
export type TaskDoneActivityOutput = z.output<typeof taskDoneActivitySchema>
export type IncidentOpenedActivityInput = z.input<typeof incidentOpenedActivitySchema>
export type IncidentOpenedActivityOutput = z.output<typeof incidentOpenedActivitySchema>
export type IncidentApprovedActivityInput = z.input<typeof incidentApprovedActivitySchema>
export type IncidentApprovedActivityOutput = z.output<typeof incidentApprovedActivitySchema>
export type MeasureCompletedActivityInput = z.input<typeof measureCompletedActivitySchema>
export type MeasureCompletedActivityOutput = z.output<typeof measureCompletedActivitySchema>
export type ActionActivityAction = z.output<typeof actionActivityActionSchema>
export type ActionActivityInput = z.input<typeof actionActivitySchema>
export type ActivityEventInput = z.input<typeof activityEventSchema>
export type ActivityEventOutput = z.output<typeof activityEventSchema>
export type LogActivityInput = z.input<typeof logActivitySchema>
export type LogActivityOutput = z.output<typeof logActivitySchema>
export type RemoveTaskActivityInput = z.input<typeof removeTaskActivitySchema>
export type RemoveTaskActivityOutput = z.output<typeof removeTaskActivitySchema>
export type RemoveReminderActivityInput = z.input<typeof removeReminderActivitySchema>
export type RemoveReminderActivityOutput = z.output<typeof removeReminderActivitySchema>
export type JournalActivityInput = z.input<typeof journalActivitySchema>
export type JournalActivityOutput = z.output<typeof journalActivitySchema>
export type JournalActivityPageInput = z.input<typeof journalActivityPageSchema>
export type JournalActivityPageOutput = z.output<typeof journalActivityPageSchema>
export type JournalNotesPageInput = z.input<typeof journalNotesPageSchema>
export type JournalNotesPageOutput = z.output<typeof journalNotesPageSchema>
