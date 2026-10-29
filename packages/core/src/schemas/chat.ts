import * as z from 'zod'

import { DESK_PRIORITIES } from '../constants'
import { ERRORS } from '../errors'

const todoRecordSchema = z.strictObject({
  title: z.string(),
  notes: z.string().nullable(),
  dueAt: z.string().nullable(),
  priority: z.enum(DESK_PRIORITIES).nullable()
})

const reminderRecordSchema = z.strictObject({
  title: z.string(),
  remindAt: z.string(),
  notes: z.string().nullable()
})

const expenseRecordSchema = z.strictObject({
  description: z.string(),
  amount: z.number(),
  currency: z.string(),
  category: z.string().nullable(),
  occurredAt: z.string().nullable()
})

const journalRecordSchema = z.strictObject({
  title: z.string().nullable(),
  content: z.string(),
  mood: z.string().nullable(),
  tags: z.array(z.string()),
  occurredAt: z.string().nullable()
})

export const deskResultSchema = z.strictObject({
  reply: z.string(),
  todos: z.array(todoRecordSchema),
  reminders: z.array(reminderRecordSchema),
  expenses: z.array(expenseRecordSchema),
  journals: z.array(journalRecordSchema)
})

export const deskResultJsonSchema = z.toJSONSchema(deskResultSchema, { target: 'draft-7' })

export const savedRecordSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('todo'),
    id: z.string(),
    title: z.string(),
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

export const chatPhaseSchema = z.object({
  phase: z.enum(['extract', 'repair', 'review']),
  model: z.string(),
  status: z.string().nullable(),
  durationMs: z.number(),
  inputTokens: z.number().nullable(),
  outputTokens: z.number().nullable(),
  reasoningTokens: z.number().nullable(),
  reasoning: z.string().nullable()
})

export const chatEventSchema = z.object({
  type: z.literal('delta'),
  text: z.string(),
  records: z.array(savedRecordSchema)
})

export const sendChatMessageSchema = z.object({
  content: z.string().trim().min(1),
  timezone: z.string().optional(),
  currency: z.string().optional()
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
export type SendChatMessageInput = z.input<typeof sendChatMessageSchema>
export type SendChatMessageOutput = z.output<typeof sendChatMessageSchema>
export type MessageThinkingInput = z.input<typeof messageThinkingSchema>
export type MessageThinkingOutput = z.output<typeof messageThinkingSchema>
export type TranscribeInput = z.input<typeof transcribeSchema>
export type TranscribeOutput = z.output<typeof transcribeSchema>

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  status: ChatStatus
  records: Array<SavedRecordOutput>
}
