import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get, timestampLabel } from './api'
import './discovery.css'

export function SearchStories({
  query,
  onSearch,
  saved = false,
}: {
  query: string
  onSearch: (value: string) => void
  saved?: boolean
}) {
  const [draft, setDraft] = useState(query)
  return (
    <form
      className="story-search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        onSearch(draft.trim())
      }}
    >
      <label htmlFor="story-query">
        {saved ? 'Search saved stories' : 'Search stories'}
      </label>
      <div className="search-controls">
        <input
          id="story-query"
          type="search"
          value={draft}
          maxLength={200}
          aria-describedby="search-scope"
          placeholder="e.g. Claude, skills, Mistral"
          onChange={(event) => setDraft(event.target.value)}
        />
        <button className="button" type="submit">
          Search
        </button>
        {query && (
          <button
            className="clear-search"
            type="button"
            onClick={() => {
              setDraft('')
              onSearch('')
            }}
          >
            Clear search
          </button>
        )}
      </div>
      <p id="search-scope">
        {saved
          ? 'Search titles and excerpts in your collection.'
          : 'Search collected titles, descriptions and publisher names.'}
      </p>
      {query.length > 200 && <p role="alert">Use at most 200 characters.</p>}
    </form>
  )
}

interface SourceStatus {
  id: number
  name: string
  last_success_at: string | null
  status: 'ok' | 'failed' | 'pending' | 'stale'
}

export function SourceUpdates() {
  const sources = useQuery({
    queryKey: ['sources'],
    queryFn: ({ signal }) => get<SourceStatus[]>('sources/', signal),
    refetchInterval: 60_000,
  })
  return (
    <details className="source-updates">
      <summary>Source updates</summary>
      <p>Source checks, separate from publication dates.</p>
      {sources.isPending ? (
        <p role="status">Checking source updates…</p>
      ) : sources.isError ? (
        <div role="status">
          <p>
            Update status is unavailable. You can still browse collected
            stories.
          </p>
          <button onClick={() => void sources.refetch()}>
            Retry update status
          </button>
        </div>
      ) : (
        <ul>
          {sources.data.map((source) => (
            <li key={source.id}>
              <strong>{source.name}</strong>
              {source.last_success_at ? (
                <span>
                  Last successful check:{' '}
                  <time dateTime={source.last_success_at}>
                    {timestampLabel(source.last_success_at)}
                  </time>
                </span>
              ) : (
                <span>No successful update recorded.</span>
              )}
              {source.status === 'failed' && (
                <span className="update-warning">
                  Latest update failed. Collected stories remain available.
                </span>
              )}
              {source.status === 'stale' && (
                <span className="update-warning">Updates are delayed.</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </details>
  )
}

export function OfflineNotice() {
  const [offline, setOffline] = useState(!navigator.onLine)
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return offline ? (
    <p className="offline-notice" role="status">
      You’re offline. Reconnect to load stories or change your saved collection.
    </p>
  ) : null
}
