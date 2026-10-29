import { ORPCError } from '@orpc/client'
import { asyncIteratorObject } from '@orpc/server'

import type {
  ChatEventOutput,
  ChatPhaseEventOutput,
  ChatPhaseOutput,
  SavedRecordOutput
} from '@tars/core/schemas/chat'
import type { Database } from '@tars/db/client'
import type {
  ChatInsert,
  ChatMessageInsert,
  ChatMessageSelect,
  ChatSelect,
  ChatThinkingInsert,
  ChatThinkingSelect
} from '@tars/db/schema'
import {
  DESK_HISTORY_CHARS,
  DESK_HISTORY_MESSAGES,
  META_CHAT_MAX_TOKENS,
  META_CHAT_MODEL
} from '@tars/core/constants'
import {
  buildDeskContext,
  buildDeskExtractionPrompt,
  buildDeskRepairPrompt,
  buildDeskReviewPrompt
} from '@tars/core/prompts'
import {
  chatEventSchema,
  deskResultJsonSchema,
  messageThinkingSchema,
  sendChatMessageSchema
} from '@tars/core/schemas/chat'
import {
  groupRecordsByMessage,
  loadDeskContextRecords,
  saveDeskRecords
} from '@tars/core/services/records'
import { needsDeskReview, parseDeskOutput } from '@tars/core/utils/desk'
import {
  chat,
  chatMessage,
  chatThinking,
  expense,
  journalEntry,
  reminder,
  todo
} from '@tars/db/schema'
import { and, asc, desc, eq, inArray } from '@tars/db/sql'

import { openAiMiddleware, protectedProcedure } from '../context'
import { ChatFailedError } from '../errors'

type DeskPhase = ChatPhaseOutput['phase']

function phaseEvent(
  phase: DeskPhase,
  status: 'running' | 'completed',
  durationMs: number | null
): ChatPhaseEventOutput {
  return { type: 'phase', phase, status, durationMs }
}

function observationRow(messageId: string, sequence: number, content: string): ChatThinkingInsert {
  return {
    id: crypto.randomUUID(),
    messageId,
    sequence,
    kind: 'observation' as const,
    content
  }
}

async function loadHistory(db: Database, chatId: string) {
  const rows = await db
    .select({ id: chatMessage.id, role: chatMessage.role, content: chatMessage.content })
    .from(chatMessage)
    .where(eq(chatMessage.chatId, chatId))
    .orderBy(desc(chatMessage.createdAt))
    .limit(DESK_HISTORY_MESSAGES)

  const history: Array<{ id: string; role: 'user' | 'assistant'; content: string }> = []
  let chars = 0

  for (const row of rows) {
    const content = row.content.trim()

    if (!content) continue
    if (history.length > 0 && chars + content.length > DESK_HISTORY_CHARS) break

    history.unshift({ ...row, content })
    chars += content.length
  }

  return history
}

async function findChat(db: Database, userId: string): Promise<Pick<ChatSelect, 'id'> | undefined> {
  const [thread] = await db
    .select({ id: chat.id })
    .from(chat)
    .where(eq(chat.userId, userId))
    .orderBy(desc(chat.updatedAt))
    .limit(1)

  return thread
}

async function resolveChatId(db: Database, userId: string): Promise<string> {
  const thread = await findChat(db, userId)

  if (thread) {
    return thread.id
  }

  const id = crypto.randomUUID()
  const values: ChatInsert = { id, userId }

  await db.insert(chat).values(values)

  return id
}

export const chatRouter = {
  list: protectedProcedure.handler(async ({ context }) => {
    const thread = await findChat(context.db, context.session.user.id)

    if (!thread) {
      return []
    }

    const rows: Array<ChatMessageSelect> = await context.db
      .select()
      .from(chatMessage)
      .where(eq(chatMessage.chatId, thread.id))
      .orderBy(asc(chatMessage.createdAt))

    const messageIds = rows.filter((row) => row.role === 'assistant').map((row) => row.id)
    let recordsByMessage = new Map<string, Array<SavedRecordOutput>>()

    if (messageIds.length > 0) {
      const [todos, reminders, expenses, journals] = await Promise.all([
        context.db.select().from(todo).where(inArray(todo.messageId, messageIds)),
        context.db.select().from(reminder).where(inArray(reminder.messageId, messageIds)),
        context.db.select().from(expense).where(inArray(expense.messageId, messageIds)),
        context.db.select().from(journalEntry).where(inArray(journalEntry.messageId, messageIds))
      ])

      recordsByMessage = groupRecordsByMessage({ todos, reminders, expenses, journals })
    }

    return rows.map(({ id, role, content, status }) => ({
      id,
      role,
      content,
      status,
      records: recordsByMessage.get(id) ?? []
    }))
  }),

  thinking: protectedProcedure.input(messageThinkingSchema).handler(async ({ input, context }) => {
    const [owned] = await context.db
      .select({ id: chatMessage.id })
      .from(chatMessage)
      .innerJoin(chat, eq(chatMessage.chatId, chat.id))
      .where(and(eq(chatMessage.id, input.messageId), eq(chat.userId, context.session.user.id)))
      .limit(1)

    if (!owned) {
      throw new ORPCError('NOT_FOUND')
    }

    const thinking: Array<Pick<ChatThinkingSelect, 'id' | 'kind' | 'content' | 'sequence'>> =
      await context.db
        .select({
          id: chatThinking.id,
          kind: chatThinking.kind,
          content: chatThinking.content,
          sequence: chatThinking.sequence
        })
        .from(chatThinking)
        .where(eq(chatThinking.messageId, input.messageId))
        .orderBy(asc(chatThinking.sequence))

    return thinking
  }),

  send: protectedProcedure
    .errors({ CHAT_FAILED: ChatFailedError })
    .input(sendChatMessageSchema)
    .output(asyncIteratorObject(chatEventSchema))
    .use(openAiMiddleware)
    .handler(async function* ({ input, context, signal, errors }) {
      const userId = context.session.user.id
      const chatId = await resolveChatId(context.db, userId)
      const history = await loadHistory(context.db, chatId)
      const contextRecords = await loadDeskContextRecords(
        context.db,
        userId,
        history.filter((message) => message.role === 'assistant').map((message) => message.id)
      )
      const deskContext = buildDeskContext({
        messages: history.map((message) => ({ role: message.role, content: message.content })),
        records: contextRecords,
        message: input.content
      })
      const userMessageId = crypto.randomUUID()
      const assistantId = crypto.randomUUID()

      const userMessage: ChatMessageInsert = {
        id: userMessageId,
        chatId,
        role: 'user',
        content: input.content,
        status: 'completed'
      }
      const assistantMessage: ChatMessageInsert = {
        id: assistantId,
        chatId,
        role: 'assistant',
        content: '',
        status: 'thinking'
      }

      await context.db.batch([
        context.db.insert(chatMessage).values(userMessage),
        context.db.insert(chatMessage).values(assistantMessage)
      ])

      let content = ''

      const extractionPrompt = buildDeskExtractionPrompt({
        now: new Date(),
        timezone: input.timezone,
        currency: input.currency
      })

      const reports: Array<ChatPhaseOutput> = []

      const runPhase = async (phase: DeskPhase, prompt: string): Promise<string> => {
        const phaseStartedAt = Date.now()
        const response = await context.openAi.responses.create(
          {
            model: META_CHAT_MODEL,
            instructions: extractionPrompt,
            input: prompt,
            reasoning: { summary: 'auto' },
            text: {
              format: {
                type: 'json_schema',
                name: 'desk_result',
                strict: true,
                schema: deskResultJsonSchema
              }
            },
            max_output_tokens: META_CHAT_MAX_TOKENS
          },
          { signal }
        )

        const summary = response.output
          .filter((item) => item.type === 'reasoning')
          .flatMap((item) => item.summary.map((part) => part.text))
          .join('\n\n')
        const usage = response.usage ?? null

        reports.push({
          phase,
          model: META_CHAT_MODEL,
          status: response.status ?? null,
          durationMs: Date.now() - phaseStartedAt,
          inputTokens: usage?.input_tokens ?? null,
          outputTokens: usage?.output_tokens ?? null,
          reasoningTokens: usage?.output_tokens_details.reasoning_tokens ?? null,
          reasoning: summary || null
        })

        return response.output_text
      }

      try {
        yield phaseEvent('extract', 'running', null)
        const extracted = await runPhase('extract', deskContext)
        yield phaseEvent('extract', 'completed', reports.at(-1)?.durationMs ?? null)
        let parsed = parseDeskOutput(extracted)

        if (!parsed.ok) {
          yield phaseEvent('repair', 'running', null)
          const repaired = await runPhase(
            'repair',
            buildDeskRepairPrompt({
              issues: parsed.issues,
              input: deskContext,
              output: parsed.output
            })
          )
          yield phaseEvent('repair', 'completed', reports.at(-1)?.durationMs ?? null)

          parsed = parseDeskOutput(repaired)
        }

        if (!parsed.ok) {
          throw new Error('Model could not produce valid records')
        }

        let result = parsed.result

        if (needsDeskReview(input.content, result)) {
          yield phaseEvent('review', 'running', null)
          const reviewed = await runPhase(
            'review',
            buildDeskReviewPrompt({ input: deskContext, draft: JSON.stringify(result) })
          )
          yield phaseEvent('review', 'completed', reports.at(-1)?.durationMs ?? null)
          const reviewedResult = parseDeskOutput(reviewed)

          if (reviewedResult.ok) {
            result = reviewedResult.result
          }
        }

        content = result.reply

        const records = await saveDeskRecords(context.db, userId, assistantId, result)

        const [first, ...rest] = [
          context.db
            .update(chatMessage)
            .set({ content, status: 'completed' })
            .where(eq(chatMessage.id, assistantId)),
          context.db.update(chat).set({ updatedAt: new Date() }).where(eq(chat.id, chatId)),
          ...reports.map((report, sequence) =>
            context.db
              .insert(chatThinking)
              .values(observationRow(assistantId, sequence, JSON.stringify(report)))
          )
        ]

        await context.db.batch([first, ...rest])

        const event: ChatEventOutput = { type: 'delta', text: content, records }

        yield event
      } catch (error) {
        console.error('chat.send failed', error)

        await context.db
          .update(chatMessage)
          .set({ content, status: 'error' })
          .where(eq(chatMessage.id, assistantId))

        await context.db
          .insert(chatThinking)
          .values(
            observationRow(assistantId, 0, error instanceof Error ? error.message : 'Chat failed')
          )

        throw errors.CHAT_FAILED({ cause: error })
      }
    })
}
