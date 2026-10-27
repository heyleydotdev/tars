import * as z from 'zod'

export const emailSchema = z.email('Enter a valid email address.')

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.')
})

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: emailSchema,
  password: z.string().min(8, 'Use at least 8 characters.')
})

export type LoginInput = z.input<typeof loginSchema>
export type LoginOutput = z.output<typeof loginSchema>
export type RegisterInput = z.input<typeof registerSchema>
export type RegisterOutput = z.output<typeof registerSchema>
