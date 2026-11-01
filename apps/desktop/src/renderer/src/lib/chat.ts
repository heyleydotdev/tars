import { ORPCError } from '@orpc/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  ChatEventOutput,
  ChatMessage,
  MessageThinkingInput,
  SummaryPeriod
} from '@tars/core/schemas/chat'
import { ERRORS } from '@tars/core/errors'
import { summaryRequestText } from '@tars/core/utils/summary'

import { orpc } from './orpc'

const chatMessagesKey = orpc.chat.list.queryKey()

export function useChatMessages() {
  return useQuery(orpc.chat.list.queryOptions())
}

export function useMessageThinking(input: MessageThinkingInput, enabled: boolean) {
  return useQuery(orpc.chat.thinking.queryOptions({ input, enabled }))
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ORPCError ? error.message : fallback
}

async function consumeChat(
  iterator: AsyncIterable<ChatEventOutput>,
  updateAssistant: (update: (message: ChatMessage) => ChatMessage) => void
): Promise<void> {
  for await (const event of iterator) {
    if (event.type === 'phase') {
      updateAssistant((message) => {
        const phases = (message.phases ?? []).filter((phase) => phase.phase !== event.phase)

        return {
          ...message,
          phases: [
            ...phases,
            { phase: event.phase, status: event.status, durationMs: event.durationMs }
          ]
        }
      })
      continue
    }

    updateAssistant((message) => ({
      ...message,
      content: message.content + event.text,
      records: event.records,
      status: 'completed'
    }))
  }
}

function pendingMessages(
  assistantKey: string,
  userContent: string,
  kind: ChatMessage['kind'],
  period: SummaryPeriod | null
): Array<ChatMessage> {
  return [
    {
      id: `user-${crypto.randomUUID()}`,
      role: 'user',
      content: userContent,
      status: 'completed',
      kind,
      period,
      from: null,
      to: null,
      records: []
    },
    {
      id: assistantKey,
      role: 'assistant',
      content: '',
      status: 'thinking',
      kind,
      period,
      from: null,
      to: null,
      records: [],
      phases: []
    }
  ]
}

export function useSendChatMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (content: string) => {
      const assistantKey = `assistant-${crypto.randomUUID()}`
      const updateAssistant = (update: (message: ChatMessage) => ChatMessage): void => {
        queryClient.setQueryData<Array<ChatMessage>>(chatMessagesKey, (messages) =>
          messages?.map((message) => (message.id === assistantKey ? update(message) : message))
        )
      }

      queryClient.setQueryData<Array<ChatMessage>>(chatMessagesKey, (messages) => [
        ...(messages ?? []),
        ...pendingMessages(assistantKey, content, 'chat', null)
      ])

      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        const iterator = await orpc.chat.send.call({ content, timezone })

        await consumeChat(iterator, updateAssistant)
      } catch (error) {
        updateAssistant((message) => ({
          ...message,
          content: errorMessage(error, ERRORS.chatFailed),
          status: 'error'
        }))
      } finally {
        void queryClient.invalidateQueries({ queryKey: chatMessagesKey })
      }
    }
  })
}

export function useSummarize() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (period: SummaryPeriod) => {
      const assistantKey = `assistant-${crypto.randomUUID()}`
      const updateAssistant = (update: (message: ChatMessage) => ChatMessage): void => {
        queryClient.setQueryData<Array<ChatMessage>>(chatMessagesKey, (messages) =>
          messages?.map((message) => (message.id === assistantKey ? update(message) : message))
        )
      }

      queryClient.setQueryData<Array<ChatMessage>>(chatMessagesKey, (messages) => [
        ...(messages ?? []),
        ...pendingMessages(assistantKey, summaryRequestText(period), 'summary', period)
      ])

      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        const iterator = await orpc.chat.summarize.call({ period, timezone })

        await consumeChat(iterator, updateAssistant)
      } catch (error) {
        updateAssistant((message) => ({
          ...message,
          content: errorMessage(error, ERRORS.summaryFailed),
          status: 'error'
        }))
      } finally {
        void queryClient.invalidateQueries({ queryKey: chatMessagesKey })
      }
    }
  })
}
