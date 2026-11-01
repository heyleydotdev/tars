import { asyncIteratorObject } from '@orpc/server'

import type {
  ChatEventOutput,
  ChatPhaseEventOutput,
  ChatPhaseOutput,
  SavedRecordOutput
} from '@tars/core/schemas/chat'
import type { SummaryData } from '@tars/core/services/summary'
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
  META_CHAT_MODEL,
  SUMMARY_MAX_TOKENS
} from '@tars/core/constants'
import { ERRORS } from '@tars/core/errors'
import {
  buildDeskContext,
  buildDeskExtractionPrompt,
  buildDeskRepairPrompt
} from '@tars/core/prompts/desk'
import { buildSummaryPrompt } from '@tars/core/prompts/summary'
import {
  chatEventSchema,
  deskResultJsonSchema,
  messageThinkingSchema,
  sendChatMessageSchema,
  summarizeChatSchema
} from '@tars/core/schemas/chat'
import {
  groupRecordsByMessage,
  loadDeskContextRecords,
  saveDeskRecords
} from '@tars/core/services/records'
import { loadSummaryData } from '@tars/core/services/summary'
import { parseDeskOutput } from '@tars/core/utils/desk'
import { resolveSummaryRange, summaryRequestText } from '@tars/core/utils/summary'
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
import { ChatFailedError, NotFoundError, SummaryFailedError } from '../errors'

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

async function finishSummary(
  db: Database,
  chatId: string,
  assistantId: string,
  content: string,
  data: SummaryData,
  observations: Array<ChatThinkingInsert>
): Promise<void> {
  const [first, ...rest] = [
    db
      .update(chatMessage)
      .set({ content, status: 'completed' })
      .where(eq(chatMessage.id, assistantId)),
    db.update(chat).set({ updatedAt: new Date() }).where(eq(chat.id, chatId)),
    db.insert(chatThinking).values(summaryDataRow(assistantId, data)),
    ...observations.map((observation) => db.insert(chatThinking).values(observation))
  ]

  await db.batch([first, ...rest])
}

function summaryDataRow(messageId: string, data: SummaryData): ChatThinkingInsert {
  return {
    id: crypto.randomUUID(),
    messageId,
    sequence: 0,
    kind: 'tool_result' as const,
    content: JSON.stringify({
      period: data.period,
      label: data.label,
      from: data.from.toISOString(),
      to: data.to.toISOString(),
      counts: data.counts,
      totals: data.totals,
      notes: data.notes,
      incidentTitles: data.incidentTitles
    })
  }
}

async function loadHistory(db: Database, chatId: string) {
  const rows = await db
    .select({
      id: chatMessage.id,
      role: chatMessage.role,
      content: chatMessage.content,
      createdAt: chatMessage.createdAt
    })
    .from(chatMessage)
    .where(and(eq(chatMessage.chatId, chatId), eq(chatMessage.kind, 'chat')))
    .orderBy(desc(chatMessage.createdAt))
    .limit(DESK_HISTORY_MESSAGES)

  const history: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    createdAt: Date
  }> = []
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

    return rows.map(({ id, role, content, status, kind, period, rangeStart, rangeEnd }) => ({
      id,
      role,
      content,
      status,
      kind,
      period,
      from: rangeStart?.toISOString() ?? null,
      to: rangeEnd?.toISOString() ?? null,
      records: recordsByMessage.get(id) ?? []
    }))
  }),

  thinking: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(messageThinkingSchema)
    .handler(async ({ input, context, errors }) => {
      const [owned] = await context.db
        .select({ id: chatMessage.id })
        .from(chatMessage)
        .innerJoin(chat, eq(chatMessage.chatId, chat.id))
        .where(and(eq(chatMessage.id, input.messageId), eq(chat.userId, context.session.user.id)))
        .limit(1)

      if (!owned) {
        throw errors.NOT_FOUND()
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
        history.filter((message) => message.role === 'assistant').map((message) => message.id),
        input.timezone
      )
      const deskContext = buildDeskContext({
        messages: history.map((message) => ({
          role: message.role,
          content: message.content,
          createdAt: message.createdAt
        })),
        message: input.content,
        timezone: input.timezone
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
        currency: input.currency,
        records: contextRecords
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

        const result = parsed.result
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
        console.error('chat.send failed')

        await context.db
          .update(chatMessage)
          .set({ content: content || ERRORS.chatFailed, status: 'error' })
          .where(eq(chatMessage.id, assistantId))

        await context.db
          .insert(chatThinking)
          .values(
            observationRow(assistantId, 0, error instanceof Error ? error.message : 'Chat failed')
          )

        throw errors.CHAT_FAILED({ cause: error })
      }
    }),

  summarize: protectedProcedure
    .errors({ SUMMARY_FAILED: SummaryFailedError })
    .input(summarizeChatSchema)
    .output(asyncIteratorObject(chatEventSchema))
    .use(openAiMiddleware)
    .handler(async function* ({ input, context, signal, errors }) {
      const userId = context.session.user.id
      const chatId = await resolveChatId(context.db, userId)
      const range = resolveSummaryRange(input.period, new Date(), input.timezone)
      const metadata = {
        kind: 'summary' as const,
        period: input.period,
        rangeStart: range.from,
        rangeEnd: range.to
      }
      const userMessageId = crypto.randomUUID()
      const assistantId = crypto.randomUUID()

      await context.db.batch([
        context.db.insert(chatMessage).values({
          id: userMessageId,
          chatId,
          role: 'user',
          content: summaryRequestText(input.period),
          status: 'completed',
          ...metadata
        }),
        context.db.insert(chatMessage).values({
          id: assistantId,
          chatId,
          role: 'assistant',
          content: '',
          status: 'thinking',
          ...metadata
        })
      ])

      const gatherStartedAt = Date.now()

      yield phaseEvent('gather', 'running', null)

      const data = await loadSummaryData(context.db, userId, {
        period: input.period,
        ...range
      })
      const gatherDuration = Date.now() - gatherStartedAt

      yield phaseEvent('gather', 'completed', gatherDuration)

      if (!data.hasActivity) {
        const content = `Nothing logged for ${range.label}.`

        await finishSummary(context.db, chatId, assistantId, content, data, [
          observationRow(
            assistantId,
            1,
            JSON.stringify({
              phase: 'gather',
              status: 'completed',
              durationMs: gatherDuration,
              empty: true
            })
          )
        ])

        yield { type: 'delta', text: content, records: [] }

        return
      }

      let content = ''

      try {
        yield phaseEvent('write', 'running', null)

        const writeStartedAt = Date.now()
        const response = await context.openAi.responses.create(
          {
            model: META_CHAT_MODEL,
            instructions: buildSummaryPrompt(data, input.timezone),
            input: 'Write the summary.',
            reasoning: { effort: 'low' },
            max_output_tokens: SUMMARY_MAX_TOKENS
          },
          { signal }
        )
        const usage = response.usage ?? null

        const reports: Array<ChatPhaseOutput> = [
          {
            phase: 'gather',
            model: META_CHAT_MODEL,
            status: 'completed',
            durationMs: gatherDuration,
            inputTokens: null,
            outputTokens: null,
            reasoningTokens: null,
            reasoning: null
          },
          {
            phase: 'write',
            model: META_CHAT_MODEL,
            status: response.status ?? null,
            durationMs: Date.now() - writeStartedAt,
            inputTokens: usage?.input_tokens ?? null,
            outputTokens: usage?.output_tokens ?? null,
            reasoningTokens: usage?.output_tokens_details.reasoning_tokens ?? null,
            reasoning: null
          }
        ]

        content = response.output_text.trim()

        if (!content) {
          throw new Error(
            `Model returned an empty summary (${response.status}, ${usage?.output_tokens ?? 0} tokens)`
          )
        }

        await finishSummary(
          context.db,
          chatId,
          assistantId,
          content,
          data,
          reports.map((report, sequence) =>
            observationRow(assistantId, sequence + 1, JSON.stringify(report))
          )
        )

        yield phaseEvent('write', 'completed', reports[1]?.durationMs ?? null)
        yield { type: 'delta', text: content, records: [] }
      } catch (error) {
        console.error('chat.summarize failed', error)

        content = content || ERRORS.summaryFailed

        await context.db.batch([
          context.db
            .update(chatMessage)
            .set({ content, status: 'error' })
            .where(eq(chatMessage.id, assistantId)),
          context.db.insert(chatThinking).values(summaryDataRow(assistantId, data)),
          context.db
            .insert(chatThinking)
            .values(
              observationRow(
                assistantId,
                1,
                error instanceof Error ? error.message : 'Summary failed'
              )
            )
        ])

        throw errors.SUMMARY_FAILED({ cause: error })
      }
    })
}
