import { useEffect, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { PlusIcon, RulerIcon } from 'lucide-react'

import type { MeasureFormOutput, MeasureReferenceItemOutput } from '@tars/core/schemas/measure'
import { ERRORS } from '@tars/core/errors'
import { measureFormSchema } from '@tars/core/schemas/measure'
import { titleCase } from '@tars/core/utils/string'
import { Button } from '@tars/ui/components/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@tars/ui/components/field'
import { Input } from '@tars/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@tars/ui/components/select'
import { Spinner } from '@tars/ui/components/spinner'

import { useMeasureReferences } from '../lib/measure'
import { FormError } from './form-error'
import MeasureReferenceDialog from './measure-reference-dialog'

const EMPTY_REFERENCES: Array<MeasureReferenceItemOutput> = []

function referenceSummary(reference: MeasureReferenceItemOutput): string {
  return `${titleCase(reference.label)} · ${reference.widthMm} × ${reference.heightMm} mm`
}

export default function MeasureForm({
  photo,
  pending,
  onMeasure,
  onChange
}: {
  photo: boolean
  pending: boolean
  onMeasure: (values: MeasureFormOutput) => Promise<string | null>
  onChange: () => void
}) {
  const [formError, setFormError] = useState<string | null>(null)
  const [addReferenceOpen, setAddReferenceOpen] = useState(false)
  const references = useMeasureReferences()
  const items = references.data?.items ?? EMPTY_REFERENCES
  const form = useForm({
    defaultValues: {
      referenceId: '',
      prompt: ''
    },
    validators: { onSubmit: measureFormSchema },
    onSubmit: async ({ value }) => {
      setFormError(null)

      try {
        const error = await onMeasure(value)

        if (error) setFormError(error)
      } catch {
        setFormError(ERRORS.measurementFailed)
      }
    }
  })

  useEffect(() => {
    const first = items[0]

    if (!first) return

    const current = form.getFieldValue('referenceId')

    if (!items.some((reference) => reference.id === current)) {
      form.setFieldValue('referenceId', first.id)
    }
  }, [form, items])

  return (
    <>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <FormError message={references.isError ? ERRORS.referencesUnavailable : formError} />

        <FieldGroup className="gap-4">
          <form.Field
            name="referenceId"
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor="measure-reference">Reference</FieldLabel>
                  <div className="flex gap-2">
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => {
                        if (typeof value !== 'string') return

                        field.handleChange(value)
                        setFormError(null)
                        onChange()
                      }}
                      disabled={
                        pending || references.isPending || references.isError || items.length === 0
                      }
                    >
                      <SelectTrigger id="measure-reference" className="min-w-0 flex-1">
                        <SelectValue>
                          {(value: string) => {
                            const reference = items.find((item) => item.id === value)

                            if (reference) return referenceSummary(reference)
                            if (references.isPending) return 'Loading References…'
                            if (references.isError) return 'References Unavailable'

                            return 'No References'
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((reference) => (
                          <SelectItem key={reference.id} value={reference.id}>
                            {referenceSummary(reference)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Add Reference"
                      disabled={pending}
                      onClick={() => setAddReferenceOpen(true)}
                    >
                      <PlusIcon />
                    </Button>
                  </div>
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
                  <FieldLabel htmlFor="measure-object">Object</FieldLabel>
                  <Input
                    id="measure-object"
                    value={field.state.value}
                    maxLength={80}
                    placeholder="Cardboard Box"
                    disabled={pending}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      field.handleChange(event.target.value)
                      setFormError(null)
                      onChange()
                    }}
                    aria-invalid={isInvalid}
                  />
                  {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                  <FieldDescription>short noun phrase, one concept</FieldDescription>
                </Field>
              )
            }}
          />

          <form.Subscribe
            selector={(state) => state.isSubmitting}
            children={(isSubmitting) => (
              <Button
                type="submit"
                className="w-full"
                disabled={!photo || pending || items.length === 0 || isSubmitting}
              >
                {isSubmitting || pending ? <Spinner /> : <RulerIcon />}
                Measure
              </Button>
            )}
          />
        </FieldGroup>
      </form>

      {addReferenceOpen ? (
        <MeasureReferenceDialog
          open
          onOpenChange={setAddReferenceOpen}
          onCreated={(reference) => {
            form.setFieldValue('referenceId', reference.id)
            setFormError(null)
            onChange()
          }}
        />
      ) : null}
    </>
  )
}
