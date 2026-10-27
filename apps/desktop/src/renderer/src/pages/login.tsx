import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { Alert, AlertDescription } from '@tars/ui/components/alert'
import { Button } from '@tars/ui/components/button'
import { Field, FieldGroup, FieldLabel } from '@tars/ui/components/field'
import { Input } from '@tars/ui/components/input'

import AuthShell from '../components/auth-shell'
import { safeRedirect } from '../lib/redirect'
import { useAuthStore } from '../stores/auth'

export default function Login() {
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
            const email = String(data.get('email') ?? '')
            const password = String(data.get('password') ?? '')

            setError(null)
            setSubmitting(true)

            try {
              await login(email, password)
              void navigate(safeRedirect(searchParams.get('redirectTo')), { replace: true })
            } catch {
              setError('Unable to sign in. Please try again.')
            } finally {
              setSubmitting(false)
            }
          })()
        }}
      >
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground text-sm">Sign in to continue to TARS.</p>
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Field>
            <FieldLabel htmlFor="login-email">Email</FieldLabel>
            <Input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="login-password">Password</FieldLabel>
            <Input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          <Field>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </Field>
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
