import { useQuery } from '@tanstack/react-query'
import { get } from '../lib/http'
import { timestampLabel } from '../lib/presentation'

export interface Health {
  status: string
  database: string
  stage: string
}

export function ConnectionStatus() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => get<Health>('health/', signal),
    refetchInterval: 30_000,
  })
  const connected = !health.isError && health.data?.database === 'connected'
  return (
    <span className={`connection ${connected ? 'connected' : ''}`}>
      {health.isPending
        ? 'Checking connection'
        : connected
          ? 'API & database connected'
          : 'Connection unavailable'}
    </span>
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
