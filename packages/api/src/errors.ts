import { error } from '@orpc/server'

import { ERRORS } from '@tars/core/errors'

export const NotFoundError = error('NOT_FOUND', {
  message: ERRORS.notFound
})
export const UnauthorizedError = error('UNAUTHORIZED', {
  message: ERRORS.unauthorized
})
export const BadRequestError = error('BAD_REQUEST', {
  message: ERRORS.badRequest
})
export const GatewayError = error('BAD_GATEWAY', {
  message: ERRORS.gatewayUnavailable
})
export const InternalServerError = error('INTERNAL_SERVER_ERROR', {
  message: ERRORS.tryAgain
})

export const TranscriptionFailedError = error('TRANSCRIPTION_FAILED', {
  message: ERRORS.transcriptionUnavailable
})

export const ChatFailedError = error('CHAT_FAILED', {
  message: ERRORS.tryAgain
})
