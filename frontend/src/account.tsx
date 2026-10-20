import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import { ApiError, get, write } from './api'
import type { Article, Session } from './api'

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: ({ signal }) => get<Session>('auth/session/', signal),
    staleTime: 30_000,
    retry: false,
  })
}

export function useAccountChange() {
  const cache = useQueryClient()
  return async (session: Session) => {
    const privateData = {
      predicate: (query: { queryKey: readonly unknown[] }) =>
        ['articles', 'article', 'bookmarks'].includes(
          String(query.queryKey[0]),
        ),
    }
    await cache.cancelQueries(privateData)
    cache.removeQueries(privateData)
    cache.setQueryData(['session'], session)
  }
}

function failure(error: Error) {
  if (error instanceof ApiError && error.status === 403)
    return 'Your session has changed. Reload the page and sign in again.'
  if (error instanceof ApiError && error.status === 429)
    return 'Too many sign-in attempts. Please wait a minute and try again.'
  if (error instanceof ApiError && error.status === 400)
    return 'Invalid username or password.'
  return 'We couldn’t complete your request. Please try again.'
}

export function AccountNav() {
  const session = useSession()
  const changeAccount = useAccountChange()
  const navigate = useNavigate()
  const signOut = useMutation({
    mutationFn: () => write<Session>('auth/logout/', 'POST'),
    onSuccess: async (data) => {
      await changeAccount(data)
      navigate('/')
    },
  })
  return (
    <div className="account-area">
      <nav className="account-nav" aria-label="Your account">
        <Link to="/bookmarks">Saved stories</Link>
        {session.isPending ? (
          <span>Checking account…</span>
        ) : session.isError ? (
          <button onClick={() => void session.refetch()}>Retry account</button>
        ) : session.data?.user ? (
          <>
            <span className="username">{session.data.user.username}</span>
            <button
              onClick={() => signOut.mutate()}
              disabled={signOut.isPending}
            >
              Sign out
            </button>
          </>
        ) : (
          <Link to="/login">Sign in</Link>
        )}
      </nav>
      {signOut.isError && (
        <p className="inline-error" role="alert">
          {failure(signOut.error)}
        </p>
      )}
    </div>
  )
}

export function BookmarkButton({ article }: { article: Article }) {
  const session = useSession()
  const cache = useQueryClient()
  const location = useLocation()
  const userId = session.data?.user?.id
  const save = useMutation({
    mutationFn: () =>
      write<{ is_bookmarked: boolean }>(
        `articles/${article.slug}/bookmark/`,
        article.is_bookmarked ? 'DELETE' : 'PUT',
      ),
    onSuccess: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['articles'] }),
        cache.invalidateQueries({ queryKey: ['article'] }),
        cache.invalidateQueries({ queryKey: ['bookmarks'] }),
      ])
    },
  })
  if (session.isPending)
    return <span className="save-status">Checking account…</span>
  if (session.isError)
    return (
      <button className="save-button" onClick={() => void session.refetch()}>
        Retry account to save
      </button>
    )
  if (!userId)
    return (
      <Link
        className="save-button"
        to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
      >
        Sign in to save
      </Link>
    )
  return (
    <div className="save-control">
      <button
        className="save-button"
        aria-pressed={article.is_bookmarked}
        disabled={save.isPending}
        onClick={() => save.mutate()}
      >
        {save.isPending
          ? 'Saving…'
          : article.is_bookmarked
            ? 'Remove bookmark'
            : 'Save story'}
      </button>
      {save.isError && (
        <p role="alert" className="inline-error">
          {failure(save.error)}
        </p>
      )}
    </div>
  )
}

export function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [params] = useSearchParams()
  const session = useSession()
  const changeAccount = useAccountChange()
  const navigate = useNavigate()
  const candidate = params.get('next') || '/'
  const next =
    /^\/(?:\?|$|bookmarks(?:\?|$)|articles\/[a-zA-Z0-9_-]+(?:\?|$))/.test(
      candidate,
    ) && !candidate.includes('\\')
      ? candidate
      : '/'
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
      <div className="eyebrow">YOUR READING, REMEMBERED</div>
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
        Accounts are created by the site administrator. Public registration is
        not available yet.
      </p>
      <Link className="text-link" to="/">
        ← Continue reading
      </Link>
    </section>
  )
}
