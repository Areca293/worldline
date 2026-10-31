import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { get } from '../lib/http'
import type { ArticlePage } from '../reading/types'
import { useSession } from '../account/session'
import { ArticleCard } from '../reading/ArticleCard'
import { Notice } from '../ui/ContentNotice'
import { SearchStories } from '../reading/SearchStories'
import { PageLinks, PageSize, useReadingPages } from '../reading/pagination'

export function SavedStories() {
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
