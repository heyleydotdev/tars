import { useState } from 'react'
import { ORPCError } from '@orpc/client'
import { useForm } from '@tanstack/react-form'

import type { ReminderItemOutput } from '@tars/core/schemas/journal'
import { updateReminderSchema } from '@tars/core/schemas/journal'
import { fromDateTimeLocal, toDateTimeLocal } from '@tars/core/utils/format'
import { Button } from '@tars/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@tars/ui/components/dialog'
import { Field, FieldGroup, FieldLabel } from '@tars/ui/components/field'
import { Input } from '@tars/ui/components/input'
import { Spinner } from '@tars/ui/components/spinner'

import { useUpdateReminder } from '../lib/journal'
import { FormError } from './form-error'

export default function ReminderEditDialog({
  reminder,
  open,
  onOpenChange
}: {
  reminder: ReminderItemOutput
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [formError, setFormError] = useState<string | null>(null)
  const updateReminder = useUpdateReminder()
  const form = useForm({
    defaultValues: {
      title: reminder.title,
      remindAt: toDateTimeLocal(reminder.remindAt)
    },
    onSubmit: async ({ value }) => {
      setFormError(null)

      const parsed = updateReminderSchema.safeParse({
        id: reminder.id,
        title: value.title.trim(),
        remindAt: fromDateTimeLocal(value.remindAt)
      })

      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message ?? 'Check the form and try again.')
        return
      }

      try {
        await updateReminder.mutateAsync(parsed.data)
        onOpenChange(false)
      } catch (error) {
        setFormError(error instanceof ORPCError ? error.message : 'Could not save. Try again.')
      }
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit reminder</DialogTitle>
          <DialogDescription>Update the reminder and save your changes.</DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <FieldGroup>
            <form.Field
              name="title"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Title</FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    required
                  />
                </Field>
              )}
            />
            <form.Field
              name="remindAt"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Remind at</FieldLabel>
                  <Input
                    id={field.name}
                    type="datetime-local"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    required
                  />
                </Field>
              )}
            />
          </FieldGroup>

          <FormError message={formError} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <form.Subscribe
              selector={(state) => state.isSubmitting}
              children={(isSubmitting) => (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Spinner /> : 'Save reminder'}
                </Button>
              )}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
