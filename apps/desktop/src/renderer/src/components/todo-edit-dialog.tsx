import { useState } from 'react'
import { ORPCError } from '@orpc/client'
import { useForm } from '@tanstack/react-form'
import * as z from 'zod'

import type { TodoItemOutput } from '@tars/core/schemas/journal'
import { ERRORS } from '@tars/core/errors'
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
import { Field, FieldError, FieldGroup, FieldLabel } from '@tars/ui/components/field'
import { Input } from '@tars/ui/components/input'
import { Spinner } from '@tars/ui/components/spinner'

import { useUpdateTodo } from '../lib/journal'
import { FormError } from './form-error'

const todoFormSchema = z.object({
  title: z.string().trim().min(1, ERRORS.titleRequired),
  dueAt: z
    .string()
    .refine((value) => value === '' || fromDateTimeLocal(value) !== null, ERRORS.dateInvalid)
})

export default function TodoEditDialog({
  todo,
  open,
  onOpenChange
}: {
  todo: TodoItemOutput
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [formError, setFormError] = useState<string | null>(null)
  const updateTodo = useUpdateTodo()
  const form = useForm({
    defaultValues: {
      title: todo.title,
      dueAt: toDateTimeLocal(todo.dueAt)
    },
    validators: { onSubmit: todoFormSchema },
    onSubmit: async ({ value }) => {
      setFormError(null)

      try {
        await updateTodo.mutateAsync({
          id: todo.id,
          title: value.title.trim(),
          dueAt: fromDateTimeLocal(value.dueAt)
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
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription>Update the task and save your changes.</DialogDescription>
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
              name="dueAt"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Due at</FieldLabel>
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
                  {isSubmitting ? <Spinner /> : 'Save task'}
                </Button>
              )}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
