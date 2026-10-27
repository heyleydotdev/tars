import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useNavigate, useSearchParams } from 'react-router'

import { loginSchema } from '@tars/core/schemas/auth'
import { Alert, AlertDescription } from '@tars/ui/components/alert'
import { Button } from '@tars/ui/components/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@tars/ui/components/field'
import { Input } from '@tars/ui/components/input'
import { Spinner } from '@tars/ui/components/spinner'

import AuthShell from '../components/auth-shell'
import { signIn } from '../lib/auth'
import { safeRedirect } from '../lib/redirect'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { email: '', password: '' },
    validators: { onSubmit: loginSchema },
    onSubmit: async ({ value }) => {
      setError(null)

      try {
        await signIn(value.email, value.password)
        void navigate(safeRedirect(searchParams.get('redirectTo')), { replace: true })
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Unable to sign in. Please try again.')
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
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground text-sm">Sign in to continue to TARS.</p>
          </div>
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
                    autoComplete="current-password"
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
                  {isSubmitting ? <Spinner /> : 'Sign in'}
                </Button>
              </Field>
            )}
          />
        </FieldGroup>
        <p className="text-muted-foreground text-center text-sm">
          No account?{' '}
          <Button
            type="button"
            variant="link"
            className="h-auto p-0"
            onClick={() => void navigate('/register')}
          >
            Create one
          </Button>
        </p>
      </form>
    </AuthShell>
  )
}
