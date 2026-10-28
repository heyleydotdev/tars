import { ORPCError } from '@orpc/client'
import { decodeBase64url } from '@orpc/server/helpers'

import { META_ASR_MODEL, VOICE_WAKE_PHRASES } from '@tars/core/constants'
import { ERRORS } from '@tars/core/errors'
import { transcribeSchema } from '@tars/core/schemas/voice'

import { openAiMiddleware, protectedProcedure } from '../context'
import { TranscriptionFailedError } from '../errors'

export const voiceRouter = {
  transcribe: protectedProcedure
    .errors({ TRANSCRIPTION_FAILED: TranscriptionFailedError })
    .input(transcribeSchema)
    .use(openAiMiddleware)
    .handler(async ({ input, context, errors }) => {
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

      let data: { transcript?: string }

      try {
        data = await context.openAi.post<{ transcript?: string }>('/asr/transcribe', {
          body: form,
          timeout: 15_000
        })
      } catch {
        throw errors.TRANSCRIPTION_FAILED()
      }

      return { text: data.transcript?.trim() ?? '' }
    })
}
