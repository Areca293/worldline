import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ApiError, get } from '../lib/http'
import { safeExternalUrl, timestampLabel } from '../lib/presentation'
import type { Article } from './types'
import { useSession } from '../account/session'
import { BookmarkButton } from '../bookmarks/BookmarkButton'
import { Metadata, TopicTag } from './ArticleCard'
import { RepositoryStats } from './repositories'
import { Notice, NotFound } from '../ui/ContentNotice'
import { ReadingAssistance } from '../assistance/ReadingAssistance'

export function Detail() {
  const session = useSession()
  const { slug } = useParams()
  const article = useQuery({
    queryKey: ['article', session.data?.user?.id ?? null, slug],
    queryFn: ({ signal }) =>
      get<Article>(`articles/${encodeURIComponent(slug!)}/`, signal),
  })
  if (article.isPending)
    return (
      <div className="notice" role="status">
        Opening your story…
      </div>
    )
  if (article.isError)
    return article.error instanceof ApiError && article.error.status === 404 ? (
      <NotFound />
    ) : (
      <Notice retry={() => void article.refetch()} />
    )
  const item = article.data
  const url = safeExternalUrl(item.original_url)
  return (
    <article className="detail">
      <Link className="text-link" to="/">
        ← Back to your world
      </Link>
      <TopicTag article={item} />
      <h1>{item.title}</h1>
      <Metadata article={item} />
      <dl className="story-dates">
        <div>
          <dt>{item.repository ? 'Repository created' : 'Published'}</dt>
          <dd>
            {item.published_at ? (
              <time dateTime={item.published_at}>
                {timestampLabel(item.published_at)}
              </time>
            ) : (
              'Publication date unavailable'
            )}
          </dd>
        </div>
        {item.source_updated_at && (
          <div>
            <dt>
              {item.repository ? 'Last pushed on GitHub' : 'Updated by source'}
            </dt>
            <dd>
              <time dateTime={item.source_updated_at}>
                {timestampLabel(item.source_updated_at)}
              </time>
            </dd>
          </div>
        )}
        <div>
          <dt>Collected by Worldline</dt>
          <dd>
            <time dateTime={item.collected_at}>
              {timestampLabel(item.collected_at)}
            </time>
          </dd>
        </div>
      </dl>
      <div className="summary-label">
        {item.is_sample
          ? 'ORIGINAL DEMO COPY'
          : item.repository
            ? 'REPOSITORY DESCRIPTION & TOPICS'
            : 'SOURCE FEED EXCERPT'}
      </div>
      <p className="detail-summary">
        {item.summary ||
          'No summary was provided by the source. Read the original article for the full story.'}
      </p>
      <RepositoryStats article={item} detailed />
      {item.repository && (
        <p className="source-note">
          Public repository metadata from GitHub. Star counts reflect interest,
          not a security or quality review. Growth is a net change within this
          observed sample, not a global trending rank. No repository code is
          downloaded or executed.
        </p>
      )}
      {!item.is_sample && !item.repository && (
        <p className="source-note">
          A short excerpt supplied by the source feed, not an AI summary.
          Published dates are shown in UTC; they are never replaced by
          collection times.
        </p>
      )}
      {item.is_sample && (
        <div className="sample-explanation">
          This is sample content, not live news. The link below is a related
          reference resource, not the source of this demo text. No publication
          date has been invented.
        </div>
      )}
      <div className="detail-actions">
        <BookmarkButton article={item} />
        {url && (
          <a
            className="button external"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {item.is_sample
              ? 'Visit reference resource'
              : item.repository
                ? 'Open repository'
                : 'Read original article'}{' '}
            <span aria-hidden="true">↗</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </div>
      <ReadingAssistance article={item} />
    </article>
  )
}
