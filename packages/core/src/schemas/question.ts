import * as z from 'zod'

export const questionKindSchema = z.enum(['short', 'long', 'select', 'date'])

export type QuestionKind = z.output<typeof questionKindSchema>
