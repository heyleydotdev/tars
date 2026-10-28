import { error } from '@orpc/server'

import { ERRORS } from '@tars/core/errors'

export const TranscriptionFailedError = error('TRANSCRIPTION_FAILED', {
  message: ERRORS.transcriptionUnavailable
})

export const ChatFailedError = error('CHAT_FAILED', {
  message: ERRORS.tryAgain
})
