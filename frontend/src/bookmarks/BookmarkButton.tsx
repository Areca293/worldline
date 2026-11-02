import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { write } from '../lib/http'
import type { Article } from '../reading/types'
import { useSession } from '../account/session'
import { failure } from '../account/feedback'

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
  const star = (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"
        fill={article.is_bookmarked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
  if (session.isPending)
    return (
      <button className="save-button" disabled aria-label="Checking account">
        {star}
      </button>
    )
  if (session.isError)
    return (
      <button
        className="save-button"
        aria-label="Retry account to save"
        title="Retry account to save"
        onClick={() => void session.refetch()}
      >
        {star}
      </button>
    )
  if (!userId)
    return (
      <Link
        className="save-button"
        aria-label="Sign in to save"
        title="Sign in to save"
        to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
      >
        {star}
      </Link>
    )
  return (
    <div className="save-control">
      <button
        className="save-button"
        aria-pressed={article.is_bookmarked}
        aria-label={
          save.isPending
            ? 'Saving…'
            : article.is_bookmarked
              ? 'Remove bookmark'
              : 'Save story'
        }
        title={article.is_bookmarked ? 'Remove bookmark' : 'Save story'}
        disabled={save.isPending}
        onClick={() => save.mutate()}
      >
        {star}
      </button>
      {save.isError && (
        <p role="alert" className="inline-error">
          {failure(save.error)}
        </p>
      )}
    </div>
  )
}
