import * as z from 'zod'

export const chatRoleSchema = z.enum(['user', 'assistant'])
export const chatStatusSchema = z.enum(['pending', 'thinking', 'completed', 'error'])

export const sendChatMessageSchema = z.object({
  content: z.string().trim().min(1)
})

export const chatEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('delta'), text: z.string() }),
  z.object({ type: z.literal('error'), message: z.string() })
])

export type ChatMessage = {
  id: string
  role: z.infer<typeof chatRoleSchema>
  content: string
  status: z.infer<typeof chatStatusSchema>
}

export type ChatEvent = z.infer<typeof chatEventSchema>
