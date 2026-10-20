import { useEffect } from 'react'
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
import { AccountNav, BookmarkButton, Login, useSession } from './account'

function ConnectionStatus() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => get<Health>('health/', signal),
    refetchInterval: 30_000,
  })
  const connected = !health.isError && health.data?.database === 'connected'
  return (
    <span className={`connection ${connected ? 'connected' : ''}`}>
      <span className="status-dot" />
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
      <span aria-hidden="true">·</span>
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
      <span className={`topic-dot ${article.topic.slug}`} />
      {article.topic.name}
      {article.is_sample && <span className="sample-tag">Sample</span>}
    </div>
  )
}

function OrbitArtwork() {
  return (
    <div className="artwork" aria-hidden="true">
      <div className="art-grid" />
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <div className="orbit orbit-three" />
      <div className="planet" />
      <div className="satellite" />
      <span className="art-caption">A WORLD IN MOTION</span>
      <span className="art-coordinate">01 / EXPLORE</span>
    </div>
  )
}

function ArticleCard({
  article,
  lead = false,
  index = 0,
}: {
  article: Article
  lead?: boolean
  index?: number
}) {
  return (
    <article className={lead ? 'lead-card' : 'article-row'}>
      {lead && <OrbitArtwork />}
      {!lead && (
        <span className="row-number" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
      )}
      <div className="article-copy">
        <TopicTag article={article} />
        <h3>
          <Link to={`/articles/${article.slug}`}>{article.title}</Link>
        </h3>
        <p>
          {article.summary ||
            'No summary was provided by the source. Open the original article to read more.'}
        </p>
        <Metadata article={article} />
        <BookmarkButton article={article} />
        {lead && (
          <Link className="text-link" to={`/articles/${article.slug}`}>
            Explore the story <span aria-hidden="true">↗</span>
          </Link>
        )}
      </div>
      {!lead && (
        <Link
          className="row-arrow"
          to={`/articles/${article.slug}`}
          aria-label={`Read ${article.title}`}
        >
          ↗
        </Link>
      )}
    </article>
  )
}

function Home() {
  const session = useSession()
  const [params, setParams] = useSearchParams()
  const topic = params.get('topic') || ''
  const page = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1)
  const topics = useQuery({
    queryKey: ['topics'],
    queryFn: ({ signal }) => get<Topic[]>('topics/', signal),
  })
  const articles = useQuery({
    queryKey: ['articles', session.data?.user?.id ?? null, topic, page],
    queryFn: ({ signal }) =>
      get<ArticlePage>(
        `articles/?topic=${encodeURIComponent(topic)}&page=${page}`,
        signal,
      ),
  })
  const items = articles.data?.results || []
  const lead = !topic && page === 1 ? items[0] : undefined
  const rest = items.filter((item) => item.id !== lead?.id)
  return (
    <>
      <section className="intro">
        <div>
          <div className="eyebrow intro-kicker">
            YOUR WINDOW TO WHAT MATTERS
          </div>
          <h1>
            A wider world.
            <br />
            <em>A curious mind.</em>
          </h1>
        </div>
        <p>
          A little perspective for your everyday.
          <br />
          Explore ideas across technology, the economy,
          <br className="desktop-break" /> finance and music. Follow your
          curiosity.
        </p>
      </section>
      <nav className="topics" aria-label="Filter by topic">
        <button
          aria-pressed={!topic}
          className={!topic ? 'active' : ''}
          onClick={() => setParams({})}
        >
          All topics <span>↗</span>
        </button>
        {topics.data?.map((item) => (
          <button
            key={item.slug}
            aria-pressed={topic === item.slug}
            className={topic === item.slug ? 'active' : ''}
            onClick={() => setParams({ topic: item.slug })}
          >
            {item.name}
          </button>
        ))}
        <span className="edition">FROM THE SOURCES</span>
      </nav>
      {topics.isError && (
        <p role="status" className="filter-error">
          Topics are unavailable.{' '}
          <button onClick={() => void topics.refetch()}>Retry topics</button>
        </p>
      )}
      {articles.isPending ? (
        <div className="notice" role="status">
          Gathering your reading…
        </div>
      ) : articles.isError ? (
        <Notice retry={() => void articles.refetch()} />
      ) : items.length === 0 ? (
        <div className="notice">
          <h2>A fresh page.</h2>
          <p>
            There are no stories in this view yet. Try another topic or come
            back later.
          </p>
        </div>
      ) : (
        <div aria-busy={articles.isFetching}>
          {lead && (
            <section className="lead-section">
              <div className="section-title">
                <h2>In focus</h2>
                <span>A place to begin</span>
              </div>
              <ArticleCard article={lead} lead />
            </section>
          )}
          <div className="reading-layout">
            <section className="stories">
              <div className="section-title">
                <h2>
                  {topic
                    ? topics.data?.find((item) => item.slug === topic)?.name ||
                      'Stories'
                    : 'Across your world'}
                </h2>
                <span>
                  {rest.length} {rest.length === 1 ? 'story' : 'stories'} to
                  explore
                </span>
              </div>
              {rest.map((article, index) => (
                <ArticleCard key={article.id} article={article} index={index} />
              ))}
            </section>
            <aside className="reading-note">
              <span className="note-icon" aria-hidden="true">
                ✳
              </span>
              <div className="eyebrow">ROOM FOR DISCOVERY</div>
              <h2>
                Good questions <br />
                start with a <br />
                <em>little curiosity.</em>
              </h2>
              <p>
                Step outside your usual reading. A different field can offer a
                whole new perspective.
              </p>
              <div className="note-bottom">
                Four topics. More possibilities.
              </div>
            </aside>
          </div>
          {(page > 1 || articles.data?.next) && (
            <nav className="pagination" aria-label="Article pages">
              <button
                className="button"
                disabled={page === 1 || articles.isPlaceholderData}
                onClick={() => setParams({ topic, page: String(page - 1) })}
              >
                Previous
              </button>
              <span>Page {page}</span>
              <button
                className="button"
                disabled={!articles.data?.next || articles.isPlaceholderData}
                onClick={() => setParams({ topic, page: String(page + 1) })}
              >
                Next
              </button>
            </nav>
          )}
        </div>
      )}
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
          <dt>Published</dt>
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
            <dt>Updated by source</dt>
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
        {item.is_sample ? 'ORIGINAL DEMO COPY' : 'SOURCE FEED EXCERPT'}
      </div>
      <p className="detail-summary">
        {item.summary ||
          'No summary was provided by the source. Read the original article for the full story.'}
      </p>
      {!item.is_sample && (
        <p className="source-note">
          A short excerpt supplied by the source feed, not an AI summary.
          Published dates are shown in UTC; they are never replaced by
          collection times.
        </p>
      )}
      <BookmarkButton article={item} />
      {item.is_sample && (
        <div className="sample-explanation">
          This is sample content, not live news. The link below is a related
          reference resource, not the source of this demo text. No publication
          date has been invented.
        </div>
      )}
      {url && (
        <a
          className="button external"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {item.is_sample
            ? 'Visit reference resource'
            : 'Read original article'}{' '}
          <span aria-hidden="true">↗</span>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
    </article>
  )
}

function SavedStories() {
  const session = useSession()
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1)
  const saved = useQuery({
    queryKey: ['bookmarks', session.data?.user?.id, page],
    queryFn: ({ signal }) =>
      get<ArticlePage>(`bookmarks/?page=${page}`, signal),
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
      <div className="eyebrow">YOUR PERSONAL COLLECTION</div>
      <h1>Worth coming back to.</h1>
      <p>Stories you’ve saved, ready when you are.</p>
      {saved.isPending ? (
        <div role="status">Loading saved stories…</div>
      ) : saved.isError ? (
        <div>
          <Notice retry={() => void saved.refetch()} />
          {page > 1 && (
            <button className="button" onClick={() => setParams({})}>
              Back to first page
            </button>
          )}
        </div>
      ) : saved.data.results.length === 0 ? (
        <div className="notice">
          <h2>No saved stories yet.</h2>
          <p>Use “Save story” on any article to keep it here.</p>
          <Link className="text-link" to="/">
            Explore stories →
          </Link>
        </div>
      ) : (
        <>
          {saved.data.results.map((article, index) => (
            <ArticleCard article={article} index={index} key={article.id} />
          ))}
          {(page > 1 || saved.data.next) && (
            <nav className="pagination" aria-label="Saved story pages">
              <button
                className="button"
                disabled={page === 1}
                onClick={() => setParams({ page: String(page - 1) })}
              >
                Previous
              </button>
              <span>Page {page}</span>
              <button
                className="button"
                disabled={!saved.data.next}
                onClick={() => setParams({ page: String(page + 1) })}
              >
                Next
              </button>
            </nav>
          )}
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
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="demo-banner">
        <span className="demo-pill">WORLDLINE</span> Stories from official
        feeds. Follow the source. Keep your perspective.
      </div>
      <div className="shell">
        <header className="header">
          <Link className="brand" to="/" aria-label="Worldline home">
            <span className="brand-mark" aria-hidden="true">
              w.
            </span>
            worldline<span className="brand-period">.</span>
          </Link>
          <div className="header-right">
            <span className="header-motto">Stay informed. Stay curious.</span>
            <AccountNav />
          </div>
        </header>
        <main id="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/articles/:slug" element={<Detail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/bookmarks" element={<SavedStories />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <footer>
          <Link className="footer-brand" to="/">
            worldline.
          </Link>
          <span>A small daily habit. A broader perspective.</span>
          <ConnectionStatus />
        </footer>
      </div>
    </>
  )
}
