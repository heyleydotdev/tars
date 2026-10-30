import { useState } from 'react'
import { ORPCError } from '@orpc/client'
import { useForm } from '@tanstack/react-form'

import type { MeasureReferenceItemOutput } from '@tars/core/schemas/measure'
import { ERRORS } from '@tars/core/errors'
import { createMeasureReferenceSchema } from '@tars/core/schemas/measure'
import { Button } from '@tars/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@tars/ui/components/dialog'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@tars/ui/components/field'
import { Input } from '@tars/ui/components/input'
import { Spinner } from '@tars/ui/components/spinner'

import { useCreateMeasureReference } from '../lib/measure'
import { FormError } from './form-error'

export default function MeasureReferenceDialog({
  open,
  onOpenChange,
  onCreated
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (reference: MeasureReferenceItemOutput) => void
}) {
  const [formError, setFormError] = useState<string | null>(null)
  const createReference = useCreateMeasureReference()
  const form = useForm({
    defaultValues: {
      label: '',
      prompt: '',
      widthMm: Number.NaN,
      heightMm: Number.NaN
    },
    validators: { onSubmit: createMeasureReferenceSchema },
    onSubmit: async ({ value }) => {
      setFormError(null)

      try {
        const reference = await createReference.mutateAsync(value)
        onCreated(reference)
        onOpenChange(false)
      } catch (error) {
        setFormError(error instanceof ORPCError ? error.message : ERRORS.referenceSaveFailed)
      }
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Reference</DialogTitle>
          <DialogDescription>
            Save a custom object with known dimensions for future measurements.
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
            <form.Field
              name="label"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="reference-label">Label</FieldLabel>
                    <Input
                      id="reference-label"

                      value={field.state.value}
                      maxLength={40}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="Shipping Box"
                      aria-invalid={isInvalid}
                    />
                    {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                  </Field>
                )
              }}
            />

            <form.Field
              name="prompt"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="reference-prompt">SAM Prompt</FieldLabel>
                    <Input
                      id="reference-prompt"

                      value={field.state.value}
                      maxLength={80}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="Cardboard Box"
                      aria-invalid={isInvalid}
                    />
                    {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                    <FieldDescription>
                      short noun phrase used to segment the reference
                    </FieldDescription>
                  </Field>
                )
              }}
            />

            <div className="grid grid-cols-2 gap-3">
              <form.Field
                name="widthMm"
                children={(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor="reference-width">Width (mm)</FieldLabel>
                      <Input
                        id="reference-width"
                        className="font-mono"
                        type="number"
                        step="0.01"
                        value={Number.isNaN(field.state.value) ? '' : field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.valueAsNumber)}
                        aria-invalid={isInvalid}
                      />
                      {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                    </Field>
                  )
                }}
              />

              <form.Field
                name="heightMm"
                children={(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor="reference-height">Height (mm)</FieldLabel>
                      <Input
                        id="reference-height"
                        className="font-mono"
                        type="number"
                        step="0.01"
                        value={Number.isNaN(field.state.value) ? '' : field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.valueAsNumber)}
                        aria-invalid={isInvalid}
                      />
                      {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                    </Field>
                  )
                }}
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
                  {isSubmitting ? <Spinner /> : 'Add Reference'}
                </Button>
              )}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
