import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { get } from '../lib/http'
import type { Topic, ArticlePage } from './types'
import { useSession } from '../account/session'
import { ArticleCard } from './ArticleCard'
import { Notice } from '../ui/ContentNotice'
import { ExploreFilters, readExplore } from './ExploreFilters'
import { ReadingSidebar } from './ReadingSidebar'
import { SearchStories } from './SearchStories'
import { SourceUpdates } from '../sources/SourceStatus'
import { DailyQuote } from '../quotes/DailyQuote'
import { PageLinks, useReadingPages } from './pagination'

export function Home() {
  const [filtersHidden, setFiltersHidden] = useState(false)
  const session = useSession()
  const [params] = useSearchParams()
  const topic = params.get('topic') || ''
  const { type, sort } = readExplore(params)
  const projects = type === 'projects'
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
      type,
      sort,
      page,
      size,
      query,
    ],
    queryFn: ({ signal }) =>
      get<ArticlePage>(
        `articles/?type=${type}&topic=${encodeURIComponent(topic)}&sort=${encodeURIComponent(sort)}&page=${page}&page_size=${size}&q=${encodeURIComponent(query)}`,
        signal,
      ),
  })
  const items = articles.data?.results || []
  const currentPage = articles.data?.page ?? page
  const lead =
    !topic && !query && !sort && currentPage === 1 ? items[0] : undefined
  const rest = items.filter((item) => item.id !== lead?.id)
  return (
    <div
      className={`reading-desk home-desk${filtersHidden ? ' filters-hidden' : ''}`}
    >
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
        key={`${type}:${query}`}
        projects={projects}
        query={query}
        onSearch={(q) => update({ q, page: '' })}
      />
      <ReadingSidebar
        collapsed={filtersHidden}
        onToggle={() => setFiltersHidden((value) => !value)}
      >
        <ExploreFilters type={type} sort={sort} update={update} />
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
        {topics.isError && (
          <p role="status" className="filter-error">
            Topics are unavailable.{' '}
            <button onClick={() => void topics.refetch()}>Retry topics</button>
          </p>
        )}
      </ReadingSidebar>
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
                  ? `No matching ${type}.`
                  : `No ${type} yet.`}
            </h2>
            <p>
              {sort === 'growth'
                ? 'Growth needs at least a day of successful observations. Try another topic or browse total stars while history builds.'
                : query
                  ? 'Try different keywords, clear the search, or choose another topic.'
                  : `There are no ${type} in this view yet. Try another topic or come back later.`}
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
                      ? `Search ${type} results`
                      : sort
                        ? sort === 'growth'
                          ? 'Observed star growth'
                          : 'Projects by total stars'
                        : topic
                          ? topics.data?.find((item) => item.slug === topic)
                              ?.name || 'Stories'
                          : 'Stories across your world'}
                  </h2>
                  <span>
                    {query
                      ? `${articles.data?.count ?? 0} matching ${sort ? (articles.data?.count === 1 ? 'project' : 'projects') : articles.data?.count === 1 ? 'story' : 'stories'}`
                      : sort
                        ? `${articles.data?.count ?? 0} projects`
                        : `${articles.data?.count ?? 0} stories`}
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
      <SourceUpdates />
      <DailyQuote />
    </div>
  )
}
