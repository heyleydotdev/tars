import { asyncIteratorObject } from '@orpc/server'
import OpenAIClient from 'openai'

import type { Database } from '@tars/db/client'
import { META_CHAT_MAX_TOKENS, META_CHAT_MODEL, META_MODEL_API_URL } from '@tars/core/constants'
import { chatEventSchema, sendChatMessageSchema } from '@tars/core/schemas/chat'
import { chat, chatMessage } from '@tars/db/schema'
import { asc, desc, eq } from '@tars/db/sql'

import { protectedProcedure } from '../context'

async function resolveChat(db: Database, userId: string) {
  const [existing] = await db
    .select()
    .from(chat)
    .where(eq(chat.userId, userId))
    .orderBy(desc(chat.updatedAt))
    .limit(1)

  if (existing) {
    return existing
  }

  const id = crypto.randomUUID()

  await db.insert(chat).values({ id, userId })

  return { id }
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

  send: protectedProcedure
    .input(sendChatMessageSchema)
    .output(asyncIteratorObject(chatEventSchema))
    .handler(async function* ({ input, context, signal }) {
      const thread = await resolveChat(context.db, context.session.user.id)
      const assistantId = crypto.randomUUID()

      await context.db.insert(chatMessage).values({
        id: crypto.randomUUID(),
        chatId: thread.id,
        role: 'user',
        content: input.content,
        status: 'completed'
      })

      const history = await context.db
        .select({ role: chatMessage.role, content: chatMessage.content })
        .from(chatMessage)
        .where(eq(chatMessage.chatId, thread.id))
        .orderBy(asc(chatMessage.createdAt))

      await context.db.insert(chatMessage).values({
        id: assistantId,
        chatId: thread.id,
        role: 'assistant',
        content: '',
        status: 'thinking'
      })

      const client = new OpenAIClient({
        apiKey: context.metaAiApiKey,
        baseURL: META_MODEL_API_URL
      })

      let content = ''

      try {
        const stream = await client.chat.completions.create({
          model: META_CHAT_MODEL,
          max_tokens: META_CHAT_MAX_TOKENS,
          stream: true,
          messages: history.map((message) => ({
            role: message.role,
            content: message.content
          }))
        })

        for await (const chunk of stream) {
          signal?.throwIfAborted()

          const text = chunk.choices[0]?.delta.content ?? ''

          if (!text) continue

          content += text
          yield { type: 'delta' as const, text }
        }

        await context.db
          .update(chatMessage)
          .set({ content, status: 'completed' })
          .where(eq(chatMessage.id, assistantId))
        await context.db.update(chat).set({ updatedAt: new Date() }).where(eq(chat.id, thread.id))
      } catch (error) {
        await context.db
          .update(chatMessage)
          .set({ content, status: 'error' })
          .where(eq(chatMessage.id, assistantId))

        yield {
          type: 'error' as const,
          message: error instanceof Error ? error.message : 'Chat failed'
        }
      }
    })
}
