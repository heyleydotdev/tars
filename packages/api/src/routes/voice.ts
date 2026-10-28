import { ORPCError } from '@orpc/client'
import { decodeBase64url } from '@orpc/server/helpers'

import { META_ASR_MODEL, META_ASR_URL, VOICE_WAKE_PHRASES } from '@tars/core/constants'
import { ERRORS } from '@tars/core/errors'
import { transcribeSchema } from '@tars/core/schemas/voice'

import { protectedProcedure } from '../context'

export const voiceRouter = {
  transcribe: protectedProcedure.input(transcribeSchema).handler(async ({ input, context }) => {
    const audio = decodeBase64url(input.audio)

    if (!audio) {
      throw new ORPCError('BAD_REQUEST', { message: ERRORS.invalidBase64 })
    }

    const form = new FormData()

    form.append(
      'request',
      new Blob(
        [
          JSON.stringify({
            model: META_ASR_MODEL,
            mode: 'PUSH_TO_TALK',
            audioEncoding: 'WAV',
            languageBias: ['English'],
            keywords: [...VOICE_WAKE_PHRASES]
          })
        ],
        { type: 'application/json' }
      )
    )
    form.append('audio', new Blob([new Uint8Array(audio)], { type: 'audio/wav' }), 'audio.wav')

    const response = await fetch(META_ASR_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${context.metaAiApiKey}` },
      body: form,
      signal: AbortSignal.timeout(15_000)
    })

    if (!response.ok) {
      throw new Error(`Meta transcription failed with status ${response.status}`)
    }

    const data = (await response.json()) as { transcript?: string }

    return { text: data.transcript?.trim() ?? '' }
  })
}
