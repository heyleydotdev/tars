import { Outlet } from 'react-router'

import type { Session } from '@tars/auth/server'

import { useVoiceSession } from '../hooks/use-voice-session'

export function VoiceWakeListener({ session }: { session: Session }) {
  useVoiceSession()

  return <Outlet context={session} />
}
