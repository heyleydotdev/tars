import { decodeBase64url } from '@orpc/server/helpers'

import { META_ASR_MODEL, META_ASR_PRICE_MICROS, VOICE_WAKE_PHRASES } from '@tars/core/constants'
import { ERRORS } from '@tars/core/errors'
import { transcribeSchema } from '@tars/core/schemas/chat'
import { usageEvent } from '@tars/db/schema'

import { aiMiddleware, protectedProcedure } from '../context'
import { BadRequestError, TranscriptionFailedError } from '../errors'

export const voiceRouter = {
  transcribe: protectedProcedure
    .errors({ BAD_REQUEST: BadRequestError, TRANSCRIPTION_FAILED: TranscriptionFailedError })
    .input(transcribeSchema)
    .use(aiMiddleware('voice'))
    .handler(async ({ input, context, errors }) => {
      const audio = decodeBase64url(input.audio)

      if (!audio) {
        throw errors.BAD_REQUEST({ message: ERRORS.invalidBase64 })
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

      let data: { transcript?: string }

      try {
        data = await context.openAi.post<{ transcript?: string }>('/asr/transcribe', {
          body: form,
          timeout: 15_000
        })
      } catch {
        throw errors.TRANSCRIPTION_FAILED()
      }

      try {
        await context.db.insert(usageEvent).values({
          id: crypto.randomUUID(),
          userId: context.session.user.id,
          feature: 'voice',
          model: META_ASR_MODEL,
          inputTokens: 0,
          outputTokens: 0,
          costMicros: META_ASR_PRICE_MICROS
        })
      } catch (error) {
        console.error('usage record failed', error)
      }

      return { text: data.transcript?.trim() ?? '' }
    })
}
