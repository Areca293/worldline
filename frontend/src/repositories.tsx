import type { Article } from './api'
import { timestampLabel } from './api'

export function RepositoryStats({
  article,
  detailed = false,
}: {
  article: Article
  detailed?: boolean
}) {
  const repo = article.repository
  if (!repo) return null
  const hours = repo.baseline_at
    ? (new Date(repo.observed_at).getTime() -
        new Date(repo.baseline_at).getTime()) /
      3_600_000
    : null
  return (
    <div className="repository-stats">
      <div className="repository-figures">
        <strong>{repo.stars.toLocaleString('en')} GitHub stars</strong>
        <span>
          {repo.is_stale
            ? 'Snapshot outdated. Growth unavailable.'
            : repo.star_change === null || hours === null
              ? 'Growth: collecting a full day of observations.'
              : `${repo.star_change > 0 ? '+' : ''}${repo.star_change.toLocaleString('en')} stars over ${hours.toFixed(1)}h`}
        </span>
      </div>
      <span className="repository-observed">
        Observed{' '}
        <time dateTime={repo.observed_at}>
          {timestampLabel(repo.observed_at)}
        </time>
      </span>
      {detailed && (
        <dl className="story-dates">
          <div>
            <dt>License reported by GitHub</dt>
            <dd>{repo.license}</dd>
          </div>
          {repo.baseline_at && (
            <div>
              <dt>Comparison baseline</dt>
              <dd>
                <time dateTime={repo.baseline_at}>
                  {timestampLabel(repo.baseline_at)}
                </time>
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  )
}

export function DiscoveryOrder({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="discovery-order">
      <label htmlFor="discovery-order">Explore</label>
      <select
        id="discovery-order"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Stories & projects</option>
        <option value="stars">Projects: most stars</option>
        <option value="growth">Projects: star growth</option>
      </select>
    </div>
  )
}
