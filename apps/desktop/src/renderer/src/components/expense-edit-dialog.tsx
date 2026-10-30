import { useState } from 'react'
import { ORPCError } from '@orpc/client'
import { useForm } from '@tanstack/react-form'

import type { ExpenseItemOutput } from '@tars/core/schemas/expenses'
import { EXPENSE_CATEGORIES } from '@tars/core/constants'
import { updateExpenseSchema } from '@tars/core/schemas/expenses'
import { fromDateTimeLocal, toDateTimeLocal } from '@tars/core/utils/format'
import { capitalize } from '@tars/core/utils/string'
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

import { useUpdateExpense } from '../lib/expenses'
import { FormError } from './form-error'

export default function ExpenseEditDialog({
  expense,
  open,
  onOpenChange
}: {
  expense: ExpenseItemOutput
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [formError, setFormError] = useState<string | null>(null)
  const updateExpense = useUpdateExpense()
  const form = useForm({
    defaultValues: {
      title: expense.title,
      description: expense.description,
      amount: expense.amountCents / 100,
      currency: expense.currency,
      category: expense.category,
      occurredAt: toDateTimeLocal(expense.occurredAt)
    },
    onSubmit: async ({ value }) => {
      setFormError(null)

      const parsed = updateExpenseSchema.safeParse({
        id: expense.id,
        title: value.title.trim(),
        description: value.description.trim(),
        amount: value.amount,
        currency: value.currency.toUpperCase(),
        category: value.category,
        occurredAt: fromDateTimeLocal(value.occurredAt)
      })

      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message ?? 'Check the form and try again.')
        return
      }

      try {
        await updateExpense.mutateAsync(parsed.data)
        onOpenChange(false)
      } catch (error) {
        setFormError(error instanceof ORPCError ? error.message : 'Could not save. Try again.')
      }
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit expense</DialogTitle>
          <DialogDescription>Update the expense and save your changes.</DialogDescription>
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
              name="description"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                  <Textarea
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Optional details"
                  />
                </Field>
              )}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
              <form.Field
                name="amount"
                children={(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Amount</FieldLabel>
                    <Input
                      id={field.name}
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(
                          Number.isNaN(event.target.valueAsNumber) ? 0 : event.target.valueAsNumber
                        )
                      }
                      required
                    />
                  </Field>
                )}
              />
              <form.Field
                name="currency"
                children={(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Currency</FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      maxLength={3}
                      pattern="[A-Za-z]{3}"
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value.toUpperCase())}
                      required
                    />
                  </Field>
                )}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <form.Field
                name="category"
                children={(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Category</FieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => {
                        if (typeof value === 'string') {
                          field.handleChange(value as (typeof EXPENSE_CATEGORIES)[number])
                        }
                      }}
                    >
                      <SelectTrigger id={field.name} className="w-full" onBlur={field.handleBlur}>
                        <SelectValue>
                          {(value: string) => (value ? capitalize(value) : null)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {capitalize(category)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <form.Field
                name="occurredAt"
                children={(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Occurred at</FieldLabel>
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
            </div>
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
                  {isSubmitting ? <Spinner /> : 'Save expense'}
                </Button>
              )}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
