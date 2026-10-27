import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useNavigate, useSearchParams } from 'react-router'

import { registerSchema } from '@tars/core/schemas/auth'
import { Alert, AlertDescription } from '@tars/ui/components/alert'
import { Button } from '@tars/ui/components/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@tars/ui/components/field'
import { Input } from '@tars/ui/components/input'
import { Spinner } from '@tars/ui/components/spinner'

import AuthShell from '../components/auth-shell'
import { signUp } from '../lib/auth'
import { safeRedirect } from '../lib/redirect'

export default function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { name: '', email: '', password: '' },
    validators: { onSubmit: registerSchema },
    onSubmit: async ({ value }) => {
      setError(null)

      try {
        await signUp(value)
        void navigate(safeRedirect(searchParams.get('redirectTo')), { replace: true })
      } catch (error) {
        setError(
          error instanceof Error ? error.message : 'Unable to create an account. Please try again.'
        )
      }
    }
  })

  return (
    <AuthShell>
      <form
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Create your account
            </h1>
            <p className="text-muted-foreground text-sm">Set up an account to continue.</p>
          </div>
          <form.Field
            name="name"
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    autoComplete="name"
                    placeholder="John Doe"
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
            name="email"
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
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
            name="password"
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="password"
                    autoComplete="new-password"
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
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <form.Subscribe
            selector={(state) => state.isSubmitting}
            children={(isSubmitting) => (
              <Field>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Spinner /> : 'Create account'}
                </Button>
              </Field>
            )}
          />
        </FieldGroup>
        <p className="text-muted-foreground text-center text-sm">
          Already have an account?{' '}
          <Button
            type="button"
            variant="link"
            className="h-auto p-0"
            onClick={() => void navigate('/login')}
          >
            Sign in
          </Button>
        </p>
      </form>
    </AuthShell>
  )
}
