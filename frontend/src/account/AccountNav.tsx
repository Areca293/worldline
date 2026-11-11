import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { write } from '../lib/http'
import type { Session } from './types'
import { useSession, useAccountChange } from './session'
import { failure } from './feedback'

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
          <>
            <Link to="/login">Sign in</Link>
            <Link to="/register">Create account</Link>
          </>
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
