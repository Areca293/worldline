import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { write } from '../lib/http'
import type { Session } from './types'
import { useSession, useAccountChange } from './session'
import { failure } from './feedback'
import { safeNextPath } from './redirect'

export function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [params] = useSearchParams()
  const session = useSession()
  const changeAccount = useAccountChange()
  const navigate = useNavigate()
  const next = safeNextPath(params.get('next'))
  const signIn = useMutation({
    mutationFn: () =>
      write<Session>('auth/login/', 'POST', { username, password }),
    onSuccess: async (data) => {
      setPassword('')
      await changeAccount(data)
      navigate(next, { replace: true })
    },
    onError: () => setPassword(''),
  })
  if (session.data?.user)
    return (
      <section className="notice">
        <h1>You’re signed in.</h1>
        <Link className="text-link" to="/bookmarks">
          Open saved stories →
        </Link>
      </section>
    )
  return (
    <section className="login-page">
      <h1>Welcome back.</h1>
      <p>Sign in to keep stories for another moment.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          signIn.mutate()
        }}
      >
        <label htmlFor="username">Username</label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          maxLength={150}
          required
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          maxLength={1024}
          required
        />
        {signIn.isError && (
          <p role="alert" className="inline-error">
            {failure(signIn.error)}
          </p>
        )}
        <button className="button" disabled={signIn.isPending}>
          {signIn.isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="account-note">
        New to Worldline?{' '}
        <Link to={`/register?next=${encodeURIComponent(next)}`}>
          Create an account
        </Link>
        .
      </p>
      <Link className="text-link" to="/">
        ← Continue reading
      </Link>
    </section>
  )
}
