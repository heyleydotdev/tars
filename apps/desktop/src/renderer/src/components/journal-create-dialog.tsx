import { useState } from 'react'
import { useForm } from '@tanstack/react-form'

import { ERRORS } from '@tars/core/errors'
import { toDateTimeLocal } from '@tars/core/utils/format'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@tars/ui/components/select'
import { Spinner } from '@tars/ui/components/spinner'
import { Textarea } from '@tars/ui/components/textarea'

import type { RecordType } from '../lib/record-create'
import { useCreateJournalEntry, useCreateReminder, useCreateTodo } from '../lib/journal'
import { buildRecordInput } from '../lib/record-create'
import { FormError } from './form-error'

const TYPES: Array<{ value: RecordType; label: string }> = [
  { value: 'note', label: 'Note' },
  { value: 'todo', label: 'Task' },
  { value: 'reminder', label: 'Reminder' }
]

export default function JournalCreateDialog({
  defaultAt,
  open,
  onOpenChange
}: {
  defaultAt: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [type, setType] = useState<RecordType>('note')
  const [formError, setFormError] = useState<string | null>(null)
  const createEntry = useCreateJournalEntry()
  const createTodo = useCreateTodo()
  const createReminder = useCreateReminder()
  const at = toDateTimeLocal(defaultAt)
  const form = useForm({
    defaultValues: {
      title: '',
      content: '',
      mood: '',
      tags: '',
      at,
      dueAt: at
    },
    onSubmit: async ({ value }) => {
      setFormError(null)

      try {
        const record = buildRecordInput(type, value)

        if (record.type === 'note') await createEntry.mutateAsync(record.input)
        if (record.type === 'todo') await createTodo.mutateAsync(record.input)
        if (record.type === 'reminder') await createReminder.mutateAsync(record.input)

        onOpenChange(false)
      } catch (error) {
        setFormError(error instanceof Error ? error.message : ERRORS.saveFailed)
      }
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New record</DialogTitle>
          <DialogDescription>
            Pick a type, fill the fields, add it to the journal.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="record-type">Type</FieldLabel>
              <Select
                value={type}
                onValueChange={(value) => {
                  if (typeof value === 'string') setType(value as RecordType)
                }}
              >
                <SelectTrigger id="record-type" className="w-full">
                  <SelectValue>
                    {(value: string) => TYPES.find((item) => item.value === value)?.label ?? null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

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
                    placeholder={type === 'note' ? 'Optional title' : 'What needs to happen?'}
                  />
                </Field>
              )}
            />

            {type === 'note' ? (
              <>
                <form.Field
                  name="content"
                  children={(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>Content</FieldLabel>
                      <Textarea
                        id={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        className="min-h-32"
                        placeholder="What happened?"
                      />
                    </Field>
                  )}
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
                    name="at"
                    children={(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Occurred at</FieldLabel>
                        <Input
                          id={field.name}
                          type="datetime-local"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) => field.handleChange(event.target.value)}
                        />
                      </Field>
                    )}
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
              </>
            ) : null}

            {type === 'todo' ? (
              <form.Field
                name="dueAt"
                children={(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Due at</FieldLabel>
                    <Input
                      id={field.name}
                      type="datetime-local"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                  </Field>
                )}
              />
            ) : null}

            {type === 'reminder' ? (
              <form.Field
                name="at"
                children={(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Remind at</FieldLabel>
                    <Input
                      id={field.name}
                      type="datetime-local"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                  </Field>
                )}
              />
            ) : null}
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
                  {isSubmitting ? <Spinner /> : `Add ${type === 'todo' ? 'task' : type}`}
                </Button>
              )}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
