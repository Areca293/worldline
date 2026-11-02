import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError, write } from '../lib/http'
import type { Session } from './types'
import { useSession, useAccountChange } from './session'
import { failure } from './feedback'
import { safeNextPath } from './redirect'

export function Register() {
  const session = useSession()
  const changeAccount = useAccountChange()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [fields, setFields] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
  })
  const registration = useMutation({
    mutationFn: () => write<Session>('auth/register/', 'POST', fields),
    onSuccess: async (data) => {
      setFields({ username: '', email: '', password: '', password_confirm: '' })
      await changeAccount(data)
      navigate(safeNextPath(params.get('next')), { replace: true })
    },
    onError: () =>
      setFields((current) => ({
        ...current,
        password: '',
        password_confirm: '',
      })),
  })
  if (session.data?.user)
    return (
      <section className="notice">
        <h1>You’re signed in.</h1>
        <Link to="/bookmarks">Open saved stories →</Link>
      </section>
    )
  const errors =
    registration.error instanceof ApiError && registration.error.status === 400
      ? registration.error.details
      : undefined
  return (
    <section className="login-page">
      <h1>Create your account.</h1>
      <p>Keep your discoveries in one place.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          registration.mutate()
        }}
      >
        {(
          [
            ['username', 'Username', 'text', 'username', 150],
            ['email', 'Email', 'email', 'email', 254],
            ['password', 'Password', 'password', 'new-password', 1024],
            [
              'password_confirm',
              'Confirm password',
              'password',
              'new-password',
              1024,
            ],
          ] as const
        ).map(([key, label, type, autoComplete, maxLength]) => (
          <div key={key}>
            <label htmlFor={`register-${key}`}>{label}</label>
            <input
              id={`register-${key}`}
              name={key}
              type={type}
              autoComplete={autoComplete}
              maxLength={maxLength}
              required
              value={fields[key]}
              onChange={(event) =>
                setFields({ ...fields, [key]: event.target.value })
              }
              aria-invalid={!!errors?.[key]}
              aria-describedby={
                errors?.[key]
                  ? `${key}-error`
                  : key === 'password'
                    ? 'password-help'
                    : undefined
              }
            />
            {errors?.[key] && (
              <p id={`${key}-error`} className="inline-error" role="alert">
                {[errors[key]].flat().join(' ')}
              </p>
            )}
          </div>
        ))}
        <p id="password-help" className="account-note">
          Use at least 8 characters. Avoid common passwords, only numbers, or
          your personal details.
        </p>
        {registration.isError && !errors && (
          <p className="inline-error" role="alert">
            {registration.error instanceof ApiError &&
            registration.error.status === 429
              ? 'Too many registration attempts. Please wait a minute and try again.'
              : failure(registration.error)}
          </p>
        )}
        {errors?.detail && (
          <p role="alert" className="inline-error">
            {errors.detail}
          </p>
        )}
        <button className="button" disabled={registration.isPending}>
          {registration.isPending ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="account-note">
        Already have an account? <Link to="/login">Sign in</Link>.
      </p>
    </section>
  )
}
