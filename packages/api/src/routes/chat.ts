import { ORPCError } from '@orpc/client'
import { asyncIteratorObject } from '@orpc/server'

import type { Database } from '@tars/db/client'
import {
  META_CHAT_MAX_TOKENS,
  META_CHAT_MODEL,
  META_CHAT_SYSTEM_PROMPT
} from '@tars/core/constants'
import {
  chatEventSchema,
  messageThinkingSchema,
  sendChatMessageSchema
} from '@tars/core/schemas/chat'
import { chat, chatMessage, chatThinking } from '@tars/db/schema'
import { and, asc, desc, eq } from '@tars/db/sql'

import { openAiMiddleware, protectedProcedure } from '../context'
import { ChatFailedError } from '../errors'

type ChatUsage = {
  input_tokens: number
  output_tokens: number
  output_tokens_details?: { reasoning_tokens?: number } | null
}

function thinkingRow(
  messageId: string,
  sequence: number,
  kind: 'reasoning' | 'tool_call' | 'tool_result' | 'observation',
  content: string
) {
  return { id: crypto.randomUUID(), messageId, sequence, kind, content }
}

async function resolveChatId(db: Database, userId: string): Promise<string> {
  const [existing] = await db
    .select({ id: chat.id })
    .from(chat)
    .where(eq(chat.userId, userId))
    .orderBy(desc(chat.updatedAt))
    .limit(1)

  if (existing) {
    return existing.id
  }

  const id = crypto.randomUUID()

  await db.insert(chat).values({ id, userId })

  return id
}

export const chatRouter = {
  list: protectedProcedure.handler(async ({ context }) => {
    const [thread] = await context.db
      .select()
      .from(chat)
      .where(eq(chat.userId, context.session.user.id))
      .orderBy(desc(chat.updatedAt))
      .limit(1)

    if (!thread) {
      return []
    }

    const rows = await context.db
      .select()
      .from(chatMessage)
      .where(eq(chatMessage.chatId, thread.id))
      .orderBy(asc(chatMessage.createdAt))

    return rows.map(({ id, role, content, status }) => ({ id, role, content, status }))
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

    return context.db
      .select({
        id: chatThinking.id,
        kind: chatThinking.kind,
        content: chatThinking.content,
        sequence: chatThinking.sequence
      })
      .from(chatThinking)
      .where(eq(chatThinking.messageId, input.messageId))
      .orderBy(asc(chatThinking.sequence))
  }),

  send: protectedProcedure
    .errors({ CHAT_FAILED: ChatFailedError })
    .input(sendChatMessageSchema)
    .output(asyncIteratorObject(chatEventSchema))
    .use(openAiMiddleware)
    .handler(async function* ({ input, context, signal, errors }) {
      const chatId = await resolveChatId(context.db, context.session.user.id)
      const assistantId = crypto.randomUUID()
      const startedAt = Date.now()

      await context.db.insert(chatMessage).values({
        id: crypto.randomUUID(),
        chatId,
        role: 'user',
        content: input.content,
        status: 'completed'
      })

      const history = await context.db
        .select({ role: chatMessage.role, content: chatMessage.content })
        .from(chatMessage)
        .where(eq(chatMessage.chatId, chatId))
        .orderBy(asc(chatMessage.createdAt))

      await context.db.insert(chatMessage).values({
        id: assistantId,
        chatId,
        role: 'assistant',
        content: '',
        status: 'thinking'
      })

      let content = ''
      const summaryParts: Array<string> = []
      let status: string | null = null
      let usage: ChatUsage | null = null

      try {
        const stream = await context.openAi.responses.create({
          model: META_CHAT_MODEL,
          instructions: META_CHAT_SYSTEM_PROMPT,
          input: history.map((message) => ({
            role: message.role,
            content: message.content
          })),
          reasoning: { summary: 'auto' },
          max_output_tokens: META_CHAT_MAX_TOKENS,
          stream: true
        })

        for await (const event of stream) {
          signal?.throwIfAborted()

          if (event.type === 'response.output_text.delta') {
            content += event.delta
            yield { type: 'delta' as const, text: event.delta }
          } else if (event.type === 'response.reasoning_summary_text.delta') {
            summaryParts[event.summary_index] =
              (summaryParts[event.summary_index] ?? '') + event.delta
          } else if (event.type === 'response.completed' || event.type === 'response.incomplete') {
            status = event.response.status ?? null
            usage = event.response.usage ?? null
          } else if (event.type === 'response.failed') {
            throw new Error(event.response.error?.message ?? 'Chat failed')
          }
        }

        const summary = summaryParts.filter(Boolean).join('\n\n')

        if (status === null) {
          throw new Error('Chat stream ended without a terminal response')
        }

        await context.db
          .update(chatMessage)
          .set({ content, status: 'completed' })
          .where(eq(chatMessage.id, assistantId))
        await context.db.update(chat).set({ updatedAt: new Date() }).where(eq(chat.id, chatId))

        if (summary) {
          await context.db
            .insert(chatThinking)
            .values(thinkingRow(assistantId, 0, 'reasoning', summary))
        }

        await context.db.insert(chatThinking).values(
          thinkingRow(
            assistantId,
            summary ? 1 : 0,
            'observation',
            JSON.stringify({
              model: META_CHAT_MODEL,
              status,
              reasoningTokens: usage?.output_tokens_details?.reasoning_tokens ?? null,
              outputTokens: usage?.output_tokens ?? null,
              inputTokens: usage?.input_tokens ?? null,
              durationMs: Date.now() - startedAt
            })
          )
        )
      } catch (error) {
        await context.db
          .update(chatMessage)
          .set({ content, status: 'error' })
          .where(eq(chatMessage.id, assistantId))

        await context.db
          .insert(chatThinking)
          .values(
            thinkingRow(
              assistantId,
              0,
              'observation',
              error instanceof Error ? error.message : 'Chat failed'
            )
          )

        throw errors.CHAT_FAILED({ cause: error })
      }
    })
}
