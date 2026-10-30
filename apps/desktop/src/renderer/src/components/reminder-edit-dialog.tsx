import { useState } from 'react'
import { ORPCError } from '@orpc/client'
import { useForm } from '@tanstack/react-form'
import * as z from 'zod'

import type { ReminderItemOutput } from '@tars/core/schemas/journal'
import { ERRORS } from '@tars/core/errors'
import {
  fromDateTimeLocal,
  fromDateTimeLocalRequired,
  toDateTimeLocal
} from '@tars/core/utils/format'
import { Button } from '@tars/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@tars/ui/components/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@tars/ui/components/field'
import { Input } from '@tars/ui/components/input'
import { Spinner } from '@tars/ui/components/spinner'

import { useUpdateReminder } from '../lib/journal'
import { FormError } from './form-error'

const reminderFormSchema = z.object({
  title: z.string().trim().min(1, ERRORS.titleRequired),
  remindAt: z
    .string()
    .min(1, ERRORS.dateInvalid)
    .refine((value) => fromDateTimeLocal(value) !== null, ERRORS.dateInvalid)
})

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
    validators: { onSubmit: reminderFormSchema },
    onSubmit: async ({ value }) => {
      setFormError(null)

      try {
        await updateReminder.mutateAsync({
          id: reminder.id,
          title: value.title.trim(),
          remindAt: fromDateTimeLocalRequired(value.remindAt)
        })
        onOpenChange(false)
      } catch (error) {
        setFormError(error instanceof ORPCError ? error.message : ERRORS.saveFailed)
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
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Title</FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                  </Field>
                )
              }}
            />
            <form.Field
              name="remindAt"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Remind at</FieldLabel>
                    <Input
                      id={field.name}
                      type="datetime-local"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                  </Field>
                )
              }}
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
