import { ORPCError } from '@orpc/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { ChatMessage, MessageThinkingInput } from '@tars/core/schemas/chat'

import { orpc } from './orpc'

const chatMessagesKey = orpc.chat.list.queryKey()

export function useChatMessages() {
  return useQuery(orpc.chat.list.queryOptions())
}

export function useMessageThinking(input: MessageThinkingInput, enabled: boolean) {
  return useQuery(orpc.chat.thinking.queryOptions({ input, enabled }))
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
        {
          id: `user-${crypto.randomUUID()}`,
          role: 'user',
          content,
          status: 'completed',
          records: []
        },
        {
          id: assistantKey,
          role: 'assistant',
          content: '',
          status: 'thinking',
          records: [],
          phases: []
        }
      ])

      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        const iterator = await orpc.chat.send.call({ content, timezone })

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
      } catch (error) {
        updateAssistant((message) => ({
          ...message,
          content: error instanceof ORPCError ? error.message : 'Chat failed',
          status: 'error'
        }))
      } finally {
        void queryClient.invalidateQueries({ queryKey: chatMessagesKey })
      }
    }
  })
}
