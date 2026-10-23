import { useEffect, useState } from 'react'
import { DiscoveryOrder, RepositoryStats } from './repositories'
import { OfflineNotice, SearchStories, SourceUpdates } from './discovery'
import { PageLinks, PageSize, useReadingPages } from './pagination'
import { useQuery } from '@tanstack/react-query'
import {
  Link,
  Route,
  Routes,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  ApiError,
  get,
  publishedLabel,
  safeExternalUrl,
  timestampLabel,
} from './api'
import type { Article, ArticlePage, Health, Topic } from './api'
import {
  AccountNav,
  BookmarkButton,
  Login,
  Register,
  useSession,
} from './account'

function ConnectionStatus() {
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

function Notice({ retry }: { retry: () => void }) {
  return (
    <div className="notice" role="alert">
      <h2>A little pause in the feed.</h2>
      <p>We couldn’t load this content. Check your connection and try again.</p>
      <button className="button" onClick={retry}>
        Try again <span aria-hidden="true">↻</span>
      </button>
    </div>
  )
}

function Metadata({ article }: { article: Article }) {
  return (
    <div className="metadata">
      <a
        href={safeExternalUrl(article.source.website_url)}
        target="_blank"
        rel="noopener noreferrer"
      >
        {article.source.name}
      </a>

      {article.published_at ? (
        <time dateTime={article.published_at}>
          {publishedLabel(article.published_at)}
        </time>
      ) : (
        <span>{publishedLabel(null)}</span>
      )}
    </div>
  )
}

function TopicTag({ article }: { article: Article }) {
  return (
    <div className="eyebrow">
      {article.topic.name}
      {article.is_sample && <span className="sample-tag">Sample</span>}
    </div>
  )
}

function ArticleCard({
  article,
  lead = false,
}: {
  article: Article
  lead?: boolean
}) {
  const [failedImage, setFailedImage] = useState('')
  const image =
    article.image_url && article.image_url !== failedImage
      ? safeExternalUrl(article.image_url)
      : undefined
  return (
    <article className={lead ? 'lead-card' : 'article-row'}>
      <div className="article-copy">
        <TopicTag article={article} />
        <div className="card-heading">
          <h3>
            <Link to={`/articles/${article.slug}`}>{article.title}</Link>
          </h3>
          {safeExternalUrl(article.original_url) && (
            <a
              className="row-arrow"
              href={safeExternalUrl(article.original_url)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${article.repository ? 'Open repository' : 'Open original article'}: ${article.title} (opens in a new tab)`}
              title={
                article.repository ? 'Open repository' : 'Open original article'
              }
            >
              <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
        <div className={`card-content ${image ? 'with-media' : ''}`}>
          <div className="card-text">
            <p>
              {article.summary ||
                'No summary was provided by the source. Open the original article to read more.'}
            </p>
            <RepositoryStats article={article} />
          </div>
          {image && (
            <figure className="card-media">
              <a
                href={safeExternalUrl(article.original_url)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`View image source: ${article.title} (opens in a new tab)`}
              >
                <img
                  src={image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={() => setFailedImage(article.image_url || '')}
                />
              </a>
              <figcaption>
                {article.image_credit || `Via ${article.source.name}`}
              </figcaption>
            </figure>
          )}
        </div>
        <a
          className="card-source"
          href={safeExternalUrl(article.source.website_url)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {article.source.name}
        </a>
        <div className="card-footer">
          {article.published_at ? (
            <time dateTime={article.published_at}>
              {article.repository ? 'Created ' : ''}
              {publishedLabel(article.published_at)}
            </time>
          ) : (
            <span>{publishedLabel(null)}</span>
          )}
          <BookmarkButton article={article} />
        </div>
      </div>
    </article>
  )
}

function Home() {
  const session = useSession()
  const [params] = useSearchParams()
  const topic = params.get('topic') || ''
  const sort = params.get('sort') || ''
  const query = (params.get('q') || '').trim()
  const { page, size, update } = useReadingPages()
  const topics = useQuery({
    queryKey: ['topics'],
    queryFn: ({ signal }) => get<Topic[]>('topics/', signal),
  })
  const articles = useQuery({
    queryKey: [
      'articles',
      session.data?.user?.id ?? null,
      topic,
      sort,
      page,
      size,
      query,
    ],
    queryFn: ({ signal }) =>
      get<ArticlePage>(
        `articles/?topic=${encodeURIComponent(topic)}&sort=${encodeURIComponent(sort)}&page=${page}&page_size=${size}&q=${encodeURIComponent(query)}`,
        signal,
      ),
  })
  const items = articles.data?.results || []
  const currentPage = articles.data?.page ?? page
  const lead =
    !topic && !query && !sort && currentPage === 1 ? items[0] : undefined
  const rest = items.filter((item) => item.id !== lead?.id)
  return (
    <>
      <section className="intro">
        <div>
          <h1>
            A wider world.
            <br />A curious mind.
          </h1>
        </div>
        <p>
          Stories and projects from reviewed sources. Follow AI, open source and
          the wider world.
        </p>
      </section>
      <SearchStories
        key={query}
        query={query}
        onSearch={(q) => update({ q, page: '' })}
      />
      <div className="reading-desk">
        <aside className="reading-tools">
          <nav className="topics" aria-label="Filter by topic">
            <button
              aria-pressed={!topic}
              className={!topic ? 'active' : ''}
              onClick={() => update({ topic: '', page: '' })}
            >
              All topics <span>↗</span>
            </button>
            {topics.data?.map((item) => (
              <button
                key={item.slug}
                aria-pressed={topic === item.slug}
                className={topic === item.slug ? 'active' : ''}
                onClick={() => update({ topic: item.slug, page: '' })}
              >
                {item.name}
              </button>
            ))}
            <span className="edition">FROM THE SOURCES</span>
          </nav>
          <div className="reading-options">
            <DiscoveryOrder
              value={sort}
              onChange={(value) => update({ sort: value, page: '' })}
            />
            <PageSize
              key={size}
              size={size}
              onChange={(value) => update({ page_size: value, page: '' })}
            />
          </div>
          {topics.isError && (
            <p role="status" className="filter-error">
              Topics are unavailable.{' '}
              <button onClick={() => void topics.refetch()}>
                Retry topics
              </button>
            </p>
          )}
        </aside>
        <div className="reading-stream">
          {articles.data?.approximate_search && articles.data.count > 0 && (
            <p className="search-feedback" role="status">
              No exact matches. Showing similar spellings for “{query}”.
            </p>
          )}
          {(sort || ['agents-skills', 'open-source'].includes(topic)) && (
            <details className="discovery-scope">
              <summary>About project coverage and growth</summary>
              <p>
                A sample of recently active GitHub projects with identified
                licenses. Total stars measure accumulated interest. Growth
                compares actual observations 24–26 hours apart; new or outdated
                observations are excluded from growth ordering.
              </p>
            </details>
          )}
          {articles.isPending ? (
            <div className="notice" role="status">
              Gathering your reading…
            </div>
          ) : articles.isError ? (
            <Notice retry={() => void articles.refetch()} />
          ) : items.length === 0 ? (
            <div className="notice">
              <h2>
                {sort === 'growth'
                  ? 'No comparable growth observations yet.'
                  : query
                    ? 'No matching stories.'
                    : 'A fresh page.'}
              </h2>
              <p>
                {sort === 'growth'
                  ? 'Growth needs at least a day of successful observations. Try another topic or browse total stars while history builds.'
                  : query
                    ? 'Try different keywords, clear the search, or choose another topic.'
                    : 'There are no stories in this view yet. Try another topic or come back later.'}
              </p>
              {sort === 'growth' && (
                <button
                  className="button"
                  onClick={() => update({ sort: 'stars', page: '' })}
                >
                  Browse total stars
                </button>
              )}
            </div>
          ) : (
            <div aria-busy={articles.isFetching}>
              {lead && (
                <section className="featured">
                  <div className="section-heading">
                    <h2>In focus</h2>
                  </div>
                  <ArticleCard article={lead} lead />
                </section>
              )}
              <div className="reading-layout">
                <section className="stories">
                  <div className="section-heading">
                    <h2>
                      {query
                        ? 'Search results'
                        : sort
                          ? sort === 'growth'
                            ? 'Observed star growth'
                            : 'Projects by total stars'
                          : topic
                            ? topics.data?.find((item) => item.slug === topic)
                                ?.name || 'Stories'
                            : 'Across your world'}
                    </h2>
                    <span>
                      {query
                        ? `${articles.data?.count ?? 0} matching ${sort ? (articles.data?.count === 1 ? 'project' : 'projects') : articles.data?.count === 1 ? 'story' : 'stories'}`
                        : sort
                          ? `${articles.data?.count ?? 0} projects`
                          : `${rest.length} ${rest.length === 1 ? 'story' : 'stories'} to explore`}
                    </span>
                  </div>
                  {rest.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </section>
              </div>
              <PageLinks
                page={currentPage}
                total={articles.data?.total_pages ?? 1}
                onChange={(value) => update({ page: String(value) })}
                label="Article pages"
              />
            </div>
          )}
        </div>
      </div>
      <SourceUpdates />
    </>
  )
}

function Detail() {
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
    </article>
  )
}

function SavedStories() {
  const session = useSession()
  const [params] = useSearchParams()
  const query = (params.get('q') || '').trim()
  const { page, size, update } = useReadingPages()
  const saved = useQuery({
    queryKey: ['bookmarks', session.data?.user?.id, page, size, query],
    queryFn: ({ signal }) =>
      get<ArticlePage>(
        `bookmarks/?page=${page}&page_size=${size}&q=${encodeURIComponent(query)}`,
        signal,
      ),
    enabled: !!session.data?.user,
  })
  if (session.isPending)
    return (
      <div className="notice" role="status">
        Checking your account…
      </div>
    )
  if (session.isError) return <Notice retry={() => void session.refetch()} />
  if (!session.data?.user)
    return (
      <section className="notice">
        <h1>A place for your discoveries.</h1>
        <p>Sign in to see your saved stories.</p>
        <Link className="button" to="/login?next=/bookmarks">
          Sign in
        </Link>
      </section>
    )
  return (
    <section className="saved-page">
      <h1>Worth coming back to.</h1>
      <p>Stories you’ve saved, ready when you are.</p>
      <SearchStories
        key={query}
        query={query}
        saved
        onSearch={(q) => update({ q, page: '' })}
      />
      <PageSize
        key={size}
        size={size}
        onChange={(value) => update({ page_size: value, page: '' })}
      />
      {saved.data?.approximate_search && saved.data.count > 0 && (
        <p className="search-feedback" role="status">
          No exact matches. Showing similar spellings in your saved stories for
          “{query}”.
        </p>
      )}
      {saved.isPending ? (
        <div role="status">Loading saved stories…</div>
      ) : saved.isError ? (
        <div>
          <Notice retry={() => void saved.refetch()} />
          {page > 1 && (
            <button className="button" onClick={() => update({ page: '' })}>
              Back to first page
            </button>
          )}
        </div>
      ) : saved.data.results.length === 0 ? (
        <div className="notice">
          <h2>
            {query ? 'No matching saved stories.' : 'No saved stories yet.'}
          </h2>
          <p>
            {query
              ? 'Try different keywords or clear the search.'
              : 'Select the star on any article to keep it here.'}
          </p>
          <Link className="text-link" to="/">
            Explore stories →
          </Link>
        </div>
      ) : (
        <>
          {saved.data.results.map((article) => (
            <ArticleCard article={article} key={article.id} />
          ))}
          <PageLinks
            page={saved.data.page ?? page}
            total={saved.data.total_pages ?? 1}
            onChange={(value) => update({ page: String(value) })}
            label="Saved story pages"
          />
        </>
      )}
    </section>
  )
}

function NotFound() {
  return (
    <div className="notice">
      <h1>This page is off the map.</h1>
      <p>That story or page couldn’t be found.</p>
      <Link className="text-link" to="/">
        Return home →
      </Link>
    </div>
  )
}

export default function App() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname, search])
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="shell">
        <header className="header">
          <Link className="brand" to="/" aria-label="Worldline home">
            WORLDLINE
          </Link>
          <div className="header-right">
            <AccountNav />
          </div>
        </header>
        <main id="main">
          <OfflineNotice />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/articles/:slug" element={<Detail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/bookmarks" element={<SavedStories />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <footer>
          <Link className="footer-brand" to="/">
            WORLDLINE
          </Link>
          <span>A small daily habit. A broader perspective.</span>
          <ConnectionStatus />
        </footer>
      </div>
    </>
  )
}
