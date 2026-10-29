import * as z from 'zod'

import { ERRORS } from '../errors'

export const emailSchema = z.email(ERRORS.invalidEmail)

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, ERRORS.passwordRequired)
})

export const registerSchema = z.object({
  name: z.string().min(1, ERRORS.nameRequired),
  email: emailSchema,
  password: z.string().min(8, ERRORS.passwordTooShort)
})

export type EmailInput = z.input<typeof emailSchema>
export type EmailOutput = z.output<typeof emailSchema>
export type LoginInput = z.input<typeof loginSchema>
export type LoginOutput = z.output<typeof loginSchema>
export type RegisterInput = z.input<typeof registerSchema>
export type RegisterOutput = z.output<typeof registerSchema>
