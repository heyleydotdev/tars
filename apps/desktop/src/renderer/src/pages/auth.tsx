import { useState } from 'react'

import { Button } from '@tars/ui/components/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@tars/ui/components/field'
import { Input } from '@tars/ui/components/input'

import AuthShell from '../components/auth-shell'

function LoginForm({
  onAuthenticated,
  onSwitch
}: {
  onAuthenticated: () => void
  onSwitch: () => void
}) {
  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        onAuthenticated()
      }}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground text-sm">Sign in to continue to TARS.</p>
        </div>
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
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </Field>
      </FieldGroup>
      <p className="text-muted-foreground text-center text-sm">
        No account?{' '}
        <Button type="button" variant="link" className="h-auto p-0" onClick={onSwitch}>
          Create one
        </Button>
      </p>
    </form>
  )
}

function RegisterForm({
  onAuthenticated,
  onSwitch
}: {
  onAuthenticated: () => void
  onSwitch: () => void
}) {
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      className="flex flex-col gap-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()

        const data = new FormData(event.currentTarget)
        const password = String(data.get('password') ?? '')
        const confirmation = String(data.get('confirmation') ?? '')

        if (password.length < 8) {
          setError('Use at least 8 characters.')
          return
        }

        if (password !== confirmation) {
          setError('Passwords do not match.')
          return
        }

        setError(null)
        onAuthenticated()
      }}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Create your account
          </h1>
          <p className="text-muted-foreground text-sm">Set up an account to continue.</p>
        </div>
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
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
        <Field>
          <Button type="submit" className="w-full">
            Create account
          </Button>
        </Field>
      </FieldGroup>
      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{' '}
        <Button type="button" variant="link" className="h-auto p-0" onClick={onSwitch}>
          Sign in
        </Button>
      </p>
    </form>
  )
}

export default function Auth({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')

  return (
    <AuthShell>
      {mode === 'login' ? (
        <LoginForm onAuthenticated={onAuthenticated} onSwitch={() => setMode('register')} />
      ) : (
        <RegisterForm onAuthenticated={onAuthenticated} onSwitch={() => setMode('login')} />
      )}
    </AuthShell>
  )
}
