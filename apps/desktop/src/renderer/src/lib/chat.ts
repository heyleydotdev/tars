import { ORPCError } from '@orpc/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { ChatMessage } from '@tars/core/schemas/chat'

import { orpc } from './orpc'

const chatMessagesKey = orpc.chat.list.queryKey()

export function useChatMessages() {
  return useQuery(orpc.chat.list.queryOptions())
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
        { id: `user-${crypto.randomUUID()}`, role: 'user', content, status: 'completed' },
        { id: assistantKey, role: 'assistant', content: '', status: 'thinking' }
      ])

      try {
        const iterator = await orpc.chat.send.call({ content })

        for await (const event of iterator) {
          updateAssistant((message) => ({ ...message, content: message.content + event.text }))
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
