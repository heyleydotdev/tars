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

      queryClient.setQueryData<Array<ChatMessage>>(chatMessagesKey, (messages) => [
        ...(messages ?? []),
        { id: `user-${crypto.randomUUID()}`, role: 'user', content, status: 'completed' },
        { id: assistantKey, role: 'assistant', content: '', status: 'thinking' }
      ])

      try {
        const iterator = await orpc.chat.send.call({ content })

        for await (const event of iterator) {
          if (event.type === 'delta') {
            queryClient.setQueryData<Array<ChatMessage>>(chatMessagesKey, (messages) =>
              messages?.map((message) =>
                message.id === assistantKey
                  ? { ...message, content: message.content + event.text }
                  : message
              )
            )
          } else {
            queryClient.setQueryData<Array<ChatMessage>>(chatMessagesKey, (messages) =>
              messages?.map((message) =>
                message.id === assistantKey
                  ? { ...message, content: event.message, status: 'error' }
                  : message
              )
            )
          }
        }
      } catch (error) {
        queryClient.setQueryData<Array<ChatMessage>>(chatMessagesKey, (messages) =>
          messages?.map((message) =>
            message.id === assistantKey
              ? {
                  ...message,
                  content: error instanceof Error ? error.message : 'Chat failed',
                  status: 'error'
                }
              : message
          )
        )
      } finally {
        void queryClient.invalidateQueries({ queryKey: chatMessagesKey })
      }
    }
  })
}
