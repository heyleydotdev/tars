import { useForm } from '@tanstack/react-form'
import { useNavigate } from 'react-router'

import { ERRORS } from '@tars/core/errors'
import { loginSchema } from '@tars/core/schemas/auth'
import { Button } from '@tars/ui/components/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@tars/ui/components/field'
import { Input } from '@tars/ui/components/input'
import { Spinner } from '@tars/ui/components/spinner'

import AuthShell from '../components/auth-shell'
import { FormError } from '../components/form-error'
import { FormFooter } from '../components/form-footer'
import { FormHeader } from '../components/form-header'
import { useAuthSubmit } from '../hooks/use-auth-submit'
import { signIn } from '../lib/auth'

export default function Login() {
  const navigate = useNavigate()
  const { error, submit } = useAuthSubmit(ERRORS.signInFailed)

  const form = useForm({
    defaultValues: { email: '', password: '' },
    validators: { onSubmit: loginSchema },
    onSubmit: ({ value }) => submit(() => signIn(value.email, value.password))
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
          <FormHeader title="Welcome back" description="Sign in to continue to TARS." />
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
          <FormError message={error} />
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
        <FormFooter
          prompt="No account?"
          action="Create one"
          onAction={() => void navigate('/register')}
        />
      </form>
    </AuthShell>
  )
}
