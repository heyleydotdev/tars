import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { Alert, AlertDescription } from '@tars/ui/components/alert'
import { Button } from '@tars/ui/components/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@tars/ui/components/field'
import { Input } from '@tars/ui/components/input'

import AuthShell from '../components/auth-shell'
import { safeRedirect } from '../lib/redirect'
import { useAuthStore } from '../stores/auth'

export default function Register() {
  const login = useAuthStore((state) => state.login)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  return (
    <AuthShell>
      <form
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          void (async () => {
            event.preventDefault()

            const data = new FormData(event.currentTarget)
            const password = String(data.get('password') ?? '')
            const confirmation = String(data.get('confirmation') ?? '')

            setError(null)

            if (password.length < 8) {
              setError('Use at least 8 characters.')
              return
            }

            if (password !== confirmation) {
              setError('Passwords do not match.')
              return
            }

            setSubmitting(true)

            try {
              await login(String(data.get('email') ?? ''), password)
              void navigate(safeRedirect(searchParams.get('redirectTo')), { replace: true })
            } catch {
              setError('Unable to create an account. Please try again.')
            } finally {
              setSubmitting(false)
            }
          })()
        }}
      >
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Create your account
            </h1>
            <p className="text-muted-foreground text-sm">Set up an account to continue.</p>
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Field>
            <FieldLabel htmlFor="register-name">Name</FieldLabel>
            <Input id="register-name" name="name" autoComplete="name" required />
          </Field>
          <Field>
            <FieldLabel htmlFor="register-email">Email</FieldLabel>
            <Input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </Field>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="register-password">Password</FieldLabel>
            <Input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={error ? true : undefined}
              onChange={() => setError(null)}
              required
            />
            <FieldDescription>At least 8 characters.</FieldDescription>
          </Field>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="register-confirmation">Confirm password</FieldLabel>
            <Input
              id="register-confirmation"
              name="confirmation"
              type="password"
              autoComplete="new-password"
              aria-invalid={error ? true : undefined}
              onChange={() => setError(null)}
              required
            />
          </Field>
          <Field>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>
          </Field>
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
