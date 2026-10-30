import * as z from 'zod'

export const deleteRecordSchema = z.object({
  id: z.string().min(1)
})

export type DeleteRecordInput = z.input<typeof deleteRecordSchema>
export type DeleteRecordOutput = z.output<typeof deleteRecordSchema>
