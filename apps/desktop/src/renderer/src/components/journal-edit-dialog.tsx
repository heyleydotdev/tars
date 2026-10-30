import { useState } from 'react'
import { ORPCError } from '@orpc/client'
import { useForm } from '@tanstack/react-form'
import * as z from 'zod'

import type { JournalItemOutput } from '@tars/core/schemas/journal'
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
import { Textarea } from '@tars/ui/components/textarea'

import { useUpdateJournalEntry } from '../lib/journal'
import { FormError } from './form-error'

const journalFormSchema = z.object({
  title: z.string(),
  content: z.string().trim().min(1, ERRORS.contentRequired),
  mood: z.string(),
  tags: z.string(),
  occurredAt: z
    .string()
    .min(1, ERRORS.dateInvalid)
    .refine((value) => fromDateTimeLocal(value) !== null, ERRORS.dateInvalid)
})

function parseTags(value: string): Array<string> {
  return [
    ...new Set(
      value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  ]
}

export default function JournalEditDialog({
  entry,
  open,
  onOpenChange
}: {
  entry: JournalItemOutput
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [formError, setFormError] = useState<string | null>(null)
  const updateEntry = useUpdateJournalEntry()
  const form = useForm({
    defaultValues: {
      title: entry.title ?? '',
      content: entry.content,
      mood: entry.mood ?? '',
      tags: entry.tags.join(', '),
      occurredAt: toDateTimeLocal(entry.occurredAt)
    },
    validators: { onSubmit: journalFormSchema },
    onSubmit: async ({ value }) => {
      setFormError(null)

      try {
        await updateEntry.mutateAsync({
          id: entry.id,
          title: value.title.trim() || null,
          content: value.content.trim(),
          mood: value.mood.trim() || null,
          tags: parseTags(value.tags),
          occurredAt: fromDateTimeLocalRequired(value.occurredAt)
        })
        onOpenChange(false)
      } catch (error) {
        setFormError(error instanceof ORPCError ? error.message : ERRORS.saveFailed)
      }
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit note</DialogTitle>
          <DialogDescription>Update the entry and save your changes.</DialogDescription>
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
                    placeholder="Optional title"
                  />
                </Field>
              )}
            />
            <form.Field
              name="content"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Content</FieldLabel>
                    <Textarea
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      className="min-h-32"
                      placeholder="What happened?"
                      aria-invalid={isInvalid}
                    />
                    {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                  </Field>
                )
              }}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <form.Field
                name="mood"
                children={(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Mood</FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="Optional mood"
                    />
                  </Field>
                )}
              />
              <form.Field
                name="occurredAt"
                children={(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Occurred at</FieldLabel>
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
            </div>
            <form.Field
              name="tags"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Tags</FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Comma-separated tags"
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
                  {isSubmitting ? <Spinner /> : 'Save note'}
                </Button>
              )}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
