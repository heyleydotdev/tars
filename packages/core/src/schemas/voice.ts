import * as z from 'zod'

import { ERRORS } from '../errors'

export const transcribeSchema = z.object({
  audio: z.string().min(1, ERRORS.audioRequired)
})
