import { useEffect, useRef, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { ImagePlusIcon, PlusIcon, RulerIcon } from 'lucide-react'

import type { MeasureFormOutput, MeasureReferenceItemOutput } from '@tars/core/schemas/measure'
import { MEASURE_PROMPT_LIMIT } from '@tars/core/constants'
import { ERRORS } from '@tars/core/errors'
import { measureFormSchema } from '@tars/core/schemas/measure'
import { titleCase } from '@tars/core/utils/string'
import { Button } from '@tars/ui/components/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@tars/ui/components/field'
import { InputGroup, InputGroupAddon, InputGroupButton } from '@tars/ui/components/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@tars/ui/components/select'
import { Spinner } from '@tars/ui/components/spinner'

import type { PreparedMeasureImage } from '../lib/measure'
import { prepareMeasureImage, useMeasureReferences } from '../lib/measure'
import { FormError } from './form-error'
import MeasurePromptEditor from './measure-prompt-editor'
import MeasureReferenceDialog from './measure-reference-dialog'

const DEFAULT_REFERENCE_ID = 'a4'
const EMPTY_REFERENCES: Array<MeasureReferenceItemOutput> = []

function referenceSummary(reference: MeasureReferenceItemOutput): string {
  return `${titleCase(reference.label)} · ${reference.widthMm} × ${reference.heightMm} mm`
}

export default function MeasureForm({
  photo,
  pending,
  onPhotos,
  onMeasure,
  onChange
}: {
  photo: boolean
  pending: boolean
  onPhotos: (photos: Array<PreparedMeasureImage>) => void
  onMeasure: (values: MeasureFormOutput) => Promise<string | null>
  onChange: () => void
}) {
  const [formError, setFormError] = useState<string | null>(null)
  const [draftPrompt, setDraftPrompt] = useState('')
  const [promptVersion, setPromptVersion] = useState(0)
  const [addReferenceOpen, setAddReferenceOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const references = useMeasureReferences()
  const items = references.data?.items ?? EMPTY_REFERENCES
  const form = useForm({
    defaultValues: {
      referenceId: '',
      prompts: [] as Array<string>
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
    const fallback = items[0]
    const defaultReference = items.find((reference) => reference.id === DEFAULT_REFERENCE_ID)

    if (!fallback) return

    const current = form.getFieldValue('referenceId')

    if (!items.some((reference) => reference.id === current)) {
      form.setFieldValue('referenceId', (defaultReference ?? fallback).id)
    }
  }, [form, items])

  async function acceptFiles(files: Array<File>): Promise<void> {
    if (files.length === 0) return

    setFormError(null)

    const photos: Array<PreparedMeasureImage> = []

    for (const file of files) {
      try {
        photos.push(await prepareMeasureImage(file))
      } catch (error) {
        setFormError(error instanceof Error ? error.message : ERRORS.imageUnreadable)
      }
    }

    if (photos.length > 0) onPhotos(photos)
  }

  function submit(): void {
    const draft = draftPrompt.trim()
    const current = form.getFieldValue('prompts')

    if (draft && current.length < MEASURE_PROMPT_LIMIT) {
      const exists = current.some((prompt) => prompt.toLowerCase() === draft.toLowerCase())

      if (!exists) form.setFieldValue('prompts', [...current, draft])

      setDraftPrompt('')
      setPromptVersion((version) => version + 1)
    }

    void form.handleSubmit()
  }

  return (
    <>
      <form
        className="bg-sidebar sticky bottom-0 z-20 border-t"
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <div className="mx-auto w-full max-w-5xl space-y-3 p-3">
          <FormError message={references.isError ? ERRORS.referencesUnavailable : formError} />

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = [...(event.target.files ?? [])]
              event.target.value = ''
              void acceptFiles(files)
            }}
          />

          <FieldGroup className="gap-3 sm:flex-row sm:items-end">
            <form.Field
              name="referenceId"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                return (
                  <Field data-invalid={isInvalid} className="sm:w-56 sm:shrink-0">
                    <FieldLabel htmlFor="measure-reference">Reference</FieldLabel>
                    <InputGroup>
                      <Select
                        value={field.state.value}
                        onValueChange={(value) => {
                          if (typeof value !== 'string') return

                          field.handleChange(value)
                          setFormError(null)
                          onChange()
                        }}
                        disabled={
                          pending ||
                          references.isPending ||
                          references.isError ||
                          items.length === 0
                        }
                      >
                        <SelectTrigger
                          id="measure-reference"
                          data-slot="input-group-control"
                          className="h-full min-w-0 flex-1 border-0 bg-transparent px-2.5 shadow-none ring-0 focus-visible:ring-0 dark:bg-transparent"
                        >
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
                      <InputGroupAddon align="inline-end" className="py-0 pr-1">
                        <InputGroupButton
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Add Reference"
                          disabled={pending}
                          onClick={() => setAddReferenceOpen(true)}
                        >
                          <PlusIcon />
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                    {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                  </Field>
                )
              }}
            />

            <form.Field
              name="prompts"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                return (
                  <Field data-invalid={isInvalid} className="min-w-0 flex-1">
                    <FieldLabel htmlFor="measure-object">Objects</FieldLabel>
                    <MeasurePromptEditor
                      key={`measure-prompts-${promptVersion}`}
                      id="measure-object"
                      value={field.state.value}
                      max={MEASURE_PROMPT_LIMIT}
                      disabled={pending}
                      placeholder="Cardboard Box"
                      invalid={isInvalid}
                      onChange={(prompts) => {
                        field.handleChange(prompts)
                        setFormError(null)
                        onChange()
                      }}
                      onDraftChange={setDraftPrompt}
                    />
                    {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                  </Field>
                )
              }}
            />

            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlusIcon />
              Browse
            </Button>

            <form.Subscribe
              selector={(state) =>
                [state.canSubmit, state.isSubmitting, state.values.prompts] as const
              }
              children={([canSubmit, isSubmitting, prompts]) => (
                <Button
                  type="button"
                  disabled={
                    !photo ||
                    pending ||
                    items.length === 0 ||
                    !canSubmit ||
                    (prompts.length === 0 && draftPrompt.trim().length === 0)
                  }
                  onClick={submit}
                >
                  {isSubmitting || pending ? <Spinner /> : <RulerIcon />}
                  Measure
                </Button>
              )}
            />
          </FieldGroup>
        </div>
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
