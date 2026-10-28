import { create } from 'zustand'

export type ChatRole = 'user' | 'assistant'

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  variant?: 'error'
}

type ChatStore = {
  messages: Array<ChatMessage>
  send: (content: string) => void
  sendError: (content: string) => void
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [
    { id: crypto.randomUUID(), role: 'assistant', content: 'Hey, I\u2019m TARS. How can I help?' },
    { id: crypto.randomUUID(), role: 'user', content: 'What can you do?' },
    {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'I can answer questions, run searches, and take voice commands.'
    },
    { id: crypto.randomUUID(), role: 'user', content: 'Nice. Show me a longer reply.' },
    {
      id: crypto.randomUUID(),
      role: 'assistant',
      content:
        'Sure. I\u2019m built on a Bun monorepo with an Electron desktop app and a Cloudflare Worker backend. Transcription goes through Meta\u2019s Muse Voice Transcribe over an oRPC WebSocket, and everything is typed end to end.'
    },
    { id: crypto.randomUUID(), role: 'user', content: 'Scroll test one' },
    { id: crypto.randomUUID(), role: 'assistant', content: 'Ack one.' },
    { id: crypto.randomUUID(), role: 'user', content: 'Scroll test two' },
    { id: crypto.randomUUID(), role: 'assistant', content: 'Ack two.' },
    { id: crypto.randomUUID(), role: 'user', content: 'Scroll test three' },
    { id: crypto.randomUUID(), role: 'assistant', content: 'Ack three.' },
    { id: crypto.randomUUID(), role: 'user', content: 'Scroll test four' },
    { id: crypto.randomUUID(), role: 'assistant', content: 'Ack four.' },
    { id: crypto.randomUUID(), role: 'user', content: 'Scroll test five' },
    { id: crypto.randomUUID(), role: 'assistant', content: 'Ack five.' },
    { id: crypto.randomUUID(), role: 'user', content: 'Scroll test six' },
    { id: crypto.randomUUID(), role: 'assistant', content: 'Ack six.' }
  ],
  send: (content) => {
    const trimmed = content.trim()

    if (!trimmed) return

    set((state) => ({
      messages: [...state.messages, { id: crypto.randomUUID(), role: 'user', content: trimmed }]
    }))
  },
  sendError: (content) => {
    set((state) => ({
      messages: [
        ...state.messages,
        { id: crypto.randomUUID(), role: 'assistant', content, variant: 'error' }
      ]
    }))
  }
}))
