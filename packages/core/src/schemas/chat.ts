import * as z from 'zod'

import { CHAT_MESSAGE_MAX_LENGTH, DESK_PRIORITIES } from '../constants'
import { ERRORS } from '../errors'

const recordIdSchema = z
  .string()
  .nullable()
  .describe('Existing record id to edit; null for a new record')

const todoRecordSchema = z.strictObject({
  id: recordIdSchema,
  title: z.string(),
  done: z.boolean().describe('True when the todo is finished'),
  notes: z.string().nullable(),
  dueAt: z.string().nullable(),
  priority: z.enum(DESK_PRIORITIES).nullable()
})

const reminderRecordSchema = z.strictObject({
  id: recordIdSchema,
  title: z.string(),
  remindAt: z.string(),
  notes: z.string().nullable()
})

const expenseRecordSchema = z.strictObject({
  id: recordIdSchema,
  description: z.string(),
  amount: z.number(),
  currency: z.string(),
  category: z.string().nullable(),
  occurredAt: z.string().nullable()
})

const journalRecordSchema = z.strictObject({
  id: recordIdSchema,
  title: z.string().nullable(),
  content: z.string(),
  mood: z.string().nullable(),
  tags: z.array(z.string()),
  occurredAt: z.string().nullable()
})

export const deskResultSchema = z.strictObject({
  reply: z.string(),
  clarification: z
    .boolean()
    .describe('True only when asking a question instead of saving; arrays must be empty'),
  todos: z.array(todoRecordSchema),
  reminders: z.array(reminderRecordSchema),
  expenses: z.array(expenseRecordSchema),
  journals: z.array(journalRecordSchema),
  deletions: z
    .array(
      z.object({
        type: z.enum(['todo', 'reminder', 'expense', 'journal']),
        id: z.string()
      })
    )
    .describe('Existing records to remove')
})

export const deskResultJsonSchema = z.toJSONSchema(deskResultSchema, { target: 'draft-7' })

export const savedRecordSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('todo'),
    id: z.string(),
    title: z.string(),
    done: z.boolean(),
    dueAt: z.string().nullable(),
    priority: z.enum(DESK_PRIORITIES).nullable()
  }),
  z.object({
    type: z.literal('reminder'),
    id: z.string(),
    title: z.string(),
    remindAt: z.string()
  }),
  z.object({
    type: z.literal('expense'),
    id: z.string(),
    description: z.string(),
    amountCents: z.number(),
    currency: z.string(),
    category: z.string().nullable()
  }),
  z.object({
    type: z.literal('journal'),
    id: z.string(),
    title: z.string().nullable(),
    content: z.string(),
    mood: z.string().nullable()
  })
])

const chatPhaseNameSchema = z.enum(['extract', 'repair', 'review'])

export const chatPhaseSchema = z.object({
  phase: chatPhaseNameSchema,
  model: z.string(),
  status: z.string().nullable(),
  durationMs: z.number(),
  inputTokens: z.number().nullable(),
  outputTokens: z.number().nullable(),
  reasoningTokens: z.number().nullable(),
  reasoning: z.string().nullable()
})

export const chatPhaseEventSchema = z.object({
  type: z.literal('phase'),
  phase: chatPhaseNameSchema,
  status: z.enum(['running', 'completed']),
  durationMs: z.number().nullable()
})

export const chatEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('delta'),
    text: z.string(),
    records: z.array(savedRecordSchema)
  }),
  chatPhaseEventSchema
])

export const sendChatMessageSchema = z.object({
  content: z.string().trim().min(1).max(CHAT_MESSAGE_MAX_LENGTH, ERRORS.messageTooLong),
  timezone: z.string().max(64).optional(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional()
})

export const messageThinkingSchema = z.object({
  messageId: z.string().min(1)
})

export const transcribeSchema = z.object({
  audio: z.string().min(1, ERRORS.audioRequired)
})

type ChatRole = 'user' | 'assistant'
type ChatStatus = 'pending' | 'thinking' | 'completed' | 'error'

export type DeskResultInput = z.input<typeof deskResultSchema>
export type DeskResultOutput = z.output<typeof deskResultSchema>
export type TodoRecordInput = DeskResultInput['todos'][number]
export type TodoRecordOutput = DeskResultOutput['todos'][number]
export type ReminderRecordInput = DeskResultInput['reminders'][number]
export type ReminderRecordOutput = DeskResultOutput['reminders'][number]
export type ExpenseRecordInput = DeskResultInput['expenses'][number]
export type ExpenseRecordOutput = DeskResultOutput['expenses'][number]
export type JournalRecordInput = DeskResultInput['journals'][number]
export type JournalRecordOutput = DeskResultOutput['journals'][number]
export type SavedRecordInput = z.input<typeof savedRecordSchema>
export type SavedRecordOutput = z.output<typeof savedRecordSchema>
export type ChatPhaseInput = z.input<typeof chatPhaseSchema>
export type ChatPhaseOutput = z.output<typeof chatPhaseSchema>
export type ChatEventInput = z.input<typeof chatEventSchema>
export type ChatEventOutput = z.output<typeof chatEventSchema>
export type ChatPhaseEventInput = z.input<typeof chatPhaseEventSchema>
export type ChatPhaseEventOutput = z.output<typeof chatPhaseEventSchema>
export type ChatPhaseProgress = {
  phase: ChatPhaseOutput['phase']
  status: 'running' | 'completed'
  durationMs: number | null
}
export type SendChatMessageInput = z.input<typeof sendChatMessageSchema>
export type SendChatMessageOutput = z.output<typeof sendChatMessageSchema>
export type MessageThinkingInput = z.input<typeof messageThinkingSchema>
export type MessageThinkingOutput = z.output<typeof messageThinkingSchema>
export type TranscribeInput = z.input<typeof transcribeSchema>
export type TranscribeOutput = z.output<typeof transcribeSchema>

type WithId<T> = Omit<T, 'id'> & { id: string }

export type DeskContextRecord =
  | ({ type: 'todo' } & WithId<TodoRecordOutput>)
  | ({ type: 'reminder' } & WithId<ReminderRecordOutput>)
  | ({ type: 'expense' } & WithId<ExpenseRecordOutput> & {
        savedAt: string
        minutesAgo: number
      })
  | ({ type: 'journal' } & WithId<JournalRecordOutput>)

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  status: ChatStatus
  records: Array<SavedRecordOutput>
  phases?: Array<ChatPhaseProgress>
}
