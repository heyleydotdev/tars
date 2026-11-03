import * as z from 'zod'

export const questionKindSchema = z.enum(['short', 'long', 'select', 'date'])

export type QuestionKind = z.output<typeof questionKindSchema>

export type QuestionKindInput = z.input<typeof questionKindSchema>
export type QuestionKindOutput = z.output<typeof questionKindSchema>
