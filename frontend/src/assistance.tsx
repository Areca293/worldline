import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useSession } from './account'
import { ApiError, get, safeExternalUrl, timestampLabel, write } from './api'
import type { Article } from './api'
import './assistance.css'

interface Allowance {
  daily_limit: number
  remaining: number
  resets: string
}
interface Capabilities {
  web_search: boolean
  answers: boolean
  reading_help: boolean
  allowance: Allowance | null
}
interface Evidence {
  id: number
  title: string
  url: string
  publisher: string
  text: string
  kind: string
  published_at: string | null
}
export interface AssistanceResult {
  answer: {
    paragraphs: { text: string; source_ids: number[] }[]
    limitations: string
    evidence_sufficient: boolean
  } | null
  sources: Evidence[]
  answer_status: string
  message: string
  retrieved_at: string | null
  generated_at: string | null
  cached: boolean
  allowance: Allowance
  mode?: string
  window?: string
  input_truncated?: boolean
}

function useCapabilities() {
  const session = useSession()
  return useQuery({
    queryKey: ['assistance-status', session.data?.user?.id ?? null],
    queryFn: ({ signal }) => get<Capabilities>('ai/status/', signal),
    retry: false,
  })
}

function errorMessage(error: Error) {
  if (error instanceof ApiError) {
    if (error.status === 403)
      return 'Your session has changed. Reload and sign in again.'
    const detail = error.details?.detail
    if (typeof detail === 'string') return detail
    if (error.status === 429)
      return 'The request limit has been reached. Please try later.'
    if (error.status === 400) return 'Check the request and try again.'
  }
  return 'The request could not be completed. Check your connection and try again.'
}

function Availability({
  kind,
  status,
}: {
  kind: 'web_search' | 'reading_help'
  status: ReturnType<typeof useCapabilities>
}) {
  if (status.isPending)
    return <p role="status">Checking assistance availability…</p>
  if (status.isError)
    return (
      <p role="alert">
        Assistance status is unavailable.{' '}
        <button className="quiet-action" onClick={() => void status.refetch()}>
          Retry status
        </button>
      </p>
    )
  if (!status.data[kind])
    return (
      <div className="assistance-notice">
        <p role="status">
          {kind === 'web_search'
            ? 'Web research is not configured. A Brave Search connection is required to retrieve web sources. The local language model cannot search the web on its own.'
            : 'Reading assistance is not configured. A model connection must be enabled on the server before excerpts can be processed.'}
        </p>
        <p>
          {kind === 'web_search'
            ? 'Collected-story search is still available. After the search connection is configured, check availability again.'
            : 'The saved source text remains available. After the model connection is configured, check availability again.'}
        </p>
        <button
          type="button"
          className="quiet-action"
          disabled={status.isFetching}
          onClick={() => void status.refetch()}
        >
          {status.isFetching
            ? 'Checking availability…'
            : 'Check availability again'}
        </button>
      </div>
    )
  return null
}

function LimitNote({ allowance }: { allowance: Allowance | null | undefined }) {
  return allowance ? (
    <p className="assistance-meta">
      {allowance.remaining} of {allowance.daily_limit} requests left today ·
      resets {allowance.resets}. Uncached attempts count, including failures.
    </p>
  ) : null
}

function EvidenceList({ sources }: { sources: Evidence[] }) {
  return (
    <section className="evidence-list" aria-label="Source evidence">
      <h2>Source evidence</h2>
      {sources.map((source) => (
        <div
          className="evidence-row"
          id={`evidence-${source.id}`}
          key={source.id}
        >
          <h3>
            <a
              href={safeExternalUrl(source.url)}
              target="_blank"
              rel="noopener noreferrer"
            >
              [{source.id}] {source.title} <span aria-hidden="true">↗</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </h3>
          <p className="assistance-meta">
            {source.publisher} ·{' '}
            {source.kind === 'search_snippet'
              ? 'Search snippet'
              : source.kind === 'repository_description'
                ? 'Repository description'
                : 'Source feed excerpt'}
          </p>
          <p>{source.text || 'No excerpt was returned for this result.'}</p>
          <p className="assistance-meta">
            {source.published_at
              ? `Published ${timestampLabel(source.published_at)}`
              : 'Publication date unavailable'}
          </p>
        </div>
      ))}
    </section>
  )
}

function Answer({ result }: { result: AssistanceResult }) {
  return (
    <div className="assistance-answer">
      <h2>
        {result.mode === 'translate'
          ? 'Chinese translation'
          : result.mode === 'explain'
            ? 'Simple English'
            : result.mode === 'summarize'
              ? 'Excerpt summary'
              : 'Answer from the sources'}
      </h2>
      <p className="assistance-meta">
        {result.answer ? 'AI-generated' : 'No AI answer'}
        {result.cached ? ' · Cached result' : ''}
        {result.generated_at ? ` · ${timestampLabel(result.generated_at)}` : ''}
      </p>
      {result.message && <p role="status">{result.message}</p>}
      {result.answer?.paragraphs.map((paragraph, i) => (
        <p key={i} lang={result.mode === 'translate' ? 'zh-Hans' : 'en'}>
          {paragraph.text}{' '}
          {paragraph.source_ids.map((id) => {
            const source = result.sources.find((item) => item.id === id)
            return source ? (
              <a
                className="citation"
                key={id}
                href={safeExternalUrl(source.url)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Source ${id}: ${source.title} (opens in a new tab)`}
              >
                [{id}]
              </a>
            ) : null
          })}
        </p>
      ))}
      {result.answer?.limitations && (
        <p className="assistance-notice">{result.answer.limitations}</p>
      )}
      <p className="assistance-meta">
        Check the cited text. A valid source link does not guarantee the model
        interpreted it correctly.
      </p>
      {result.input_truncated && (
        <p className="assistance-meta">
          Only the first 8,000 characters of the saved excerpt were processed.
        </p>
      )}
    </div>
  )
}

export function Research() {
  const session = useSession()
  if (session.isPending)
    return (
      <section className="research-page">
        <h1>Web research.</h1>
        <p role="status">Checking your account…</p>
      </section>
    )
  if (session.isError)
    return (
      <section className="research-page">
        <h1>Web research.</h1>
        <p role="alert">Your account could not be checked.</p>
        <button className="quiet-action" onClick={() => void session.refetch()}>
          Retry account
        </button>
      </section>
    )
  // Remount on account changes so private questions and results never carry over.
  return <ResearchForm key={session.data?.user?.id ?? 'anonymous'} />
}

function ResearchForm() {
  const session = useSession()
  const status = useCapabilities()
  const cache = useQueryClient()
  const [query, setQuery] = useState('')
  const [window, setWindow] = useState('week')
  const research = useMutation({
    mutationKey: ['assistance'],
    mutationFn: (input: { query: string; window: string }) =>
      write<AssistanceResult>('ai/research/', 'POST', input),
    retry: false,
    gcTime: 0,
    onSettled: () =>
      cache.invalidateQueries({ queryKey: ['assistance-status'] }),
  })
  const result = research.data
  return (
    <section className="research-page">
      <div className="research-heading">
        <h1>Web research.</h1>
        <Link className="text-link" to="/">
          ← Search collected stories
        </Link>
      </div>
      <p className="research-intro">
        Explore public web results and inspect the evidence behind an English AI
        answer.
      </p>
      <Availability kind="web_search" status={status} />
      {!session.isPending && !session.data?.user && (
        <p>
          <Link className="text-link" to="/login?next=%2Fresearch">
            Sign in to research
          </Link>
          . Research requests use your daily allowance.
        </p>
      )}
      {status.isSuccess && status.data.web_search && session.data?.user && (
        <form
          className="research-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (!research.isPending)
              research.mutate({ query: query.trim(), window })
          }}
        >
          <div className="research-input">
            <label htmlFor="research-query">Research question</label>
            <input
              id="research-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. What changed in open-source AI this week?"
              minLength={3}
              maxLength={300}
              required
              aria-describedby="research-scope"
            />
          </div>
          <div>
            <label htmlFor="research-window">Page age</label>
            <select
              id="research-window"
              value={window}
              onChange={(event) => setWindow(event.target.value)}
            >
              <option value="day">Past 24 hours</option>
              <option value="week">Past 7 days</option>
              <option value="month">Past 31 days</option>
              <option value="any">Any time</option>
            </select>
          </div>
          <button
            className="button"
            disabled={
              research.isPending ||
              !session.data?.user ||
              !status.data?.web_search
            }
          >
            {research.isPending ? 'Researching…' : 'Search the web'}
          </button>
        </form>
      )}
      <p className="assistance-meta" id="research-scope">
        Brave searches outside Worldline. Page age may refer to a page update,
        not publication. Your question and returned snippets are sent to the
        configured providers. Do not include private information.
      </p>
      {status.data?.web_search && !status.data.answers && (
        <p className="assistance-notice">
          AI answers are not configured. Web search results are still available.
        </p>
      )}
      <LimitNote allowance={status.data?.allowance ?? result?.allowance} />
      {research.isPending && (
        <p role="status">
          Retrieving sources and checking the available evidence…
        </p>
      )}
      {research.isError && (
        <div role="alert" className="assistance-notice">
          <p>{errorMessage(research.error)}</p>
          <button
            className="quiet-action"
            onClick={() =>
              research.variables && research.mutate(research.variables)
            }
          >
            Try research again
          </button>
        </div>
      )}
      {result && !research.isPending && !research.isError && (
        <section className="research-results" aria-label="Research results">
          <div className="research-result-heading">
            <h2>{research.variables?.query}</h2>
            <p className="assistance-meta">
              {result.sources.length} sources · Page age:{' '}
              {
                (
                  {
                    day: 'past 24 hours',
                    week: 'past 7 days',
                    month: 'past 31 days',
                    any: 'any time',
                  } as Record<string, string>
                )[result.window ?? 'any']
              }
              {result.retrieved_at
                ? ` · Retrieved ${timestampLabel(result.retrieved_at)}`
                : ''}
              {result.cached ? ' · Cached' : ''}
            </p>
          </div>
          {result.sources.length === 0 ? (
            <p className="assistance-notice">
              No results for this question and page-age filter. Try different
              words or a wider time range.
            </p>
          ) : (
            <div className="research-columns">
              <Answer result={result} />
              <EvidenceList sources={result.sources} />
            </div>
          )}
        </section>
      )}
    </section>
  )
}

export function ReadingAssistance({ article }: { article: Article }) {
  const session = useSession()
  if (article.is_sample) return null
  return (
    <details className="reading-assistance">
      <summary>Reading assistance</summary>
      {session.isPending ? (
        <p role="status">Checking your account…</p>
      ) : session.isError ? (
        <p role="alert">
          Your account could not be checked.{' '}
          <button
            className="quiet-action"
            onClick={() => void session.refetch()}
          >
            Retry account
          </button>
        </p>
      ) : (
        <ReadingForm
          key={`${session.data?.user?.id ?? 'anonymous'}:${article.id}`}
          article={article}
        />
      )}
    </details>
  )
}

function ReadingForm({ article }: { article: Article }) {
  const session = useSession()
  const status = useCapabilities()
  const cache = useQueryClient()
  const [mode, setMode] = useState('summarize')
  const assist = useMutation({
    mutationKey: ['assistance'],
    retry: false,
    gcTime: 0,
    mutationFn: (chosen: string) =>
      write<AssistanceResult>(`ai/articles/${article.slug}/`, 'POST', {
        mode: chosen,
      }),
    onSettled: () =>
      cache.invalidateQueries({ queryKey: ['assistance-status'] }),
  })
  return (
    <div className="reading-assistance-body">
      <p>
        Work with this{' '}
        {article.repository ? 'repository description' : 'source feed excerpt'}:
        an English summary, a Chinese translation, or simpler English. Only the
        saved text is sent to the model, never an unavailable full article.
      </p>
      {!article.summary.trim() ? (
        <div className="assistance-notice">
          <p role="status">Reading assistance is unavailable for this story.</p>
          <p>
            The source did not provide an excerpt. There is no saved text to
            summarize, translate or explain. Worldline does not retrieve the
            full article for reading assistance.
          </p>
          <a
            className="text-link"
            href={safeExternalUrl(article.original_url)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open original article <span aria-hidden="true">↗</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      ) : (
        <Availability kind="reading_help" status={status} />
      )}
      {!session.isPending && !session.data?.user && (
        <p>
          <Link
            className="text-link"
            to={`/login?next=${encodeURIComponent(`/articles/${article.slug}`)}`}
          >
            Sign in to use reading assistance
          </Link>
          .
        </p>
      )}
      {article.summary.trim() &&
        status.isSuccess &&
        status.data.reading_help &&
        session.data?.user && (
          <form
            className="reading-help-form"
            onSubmit={(event) => {
              event.preventDefault()
              if (!assist.isPending) assist.mutate(mode)
            }}
          >
            <label htmlFor="reading-mode">Reading task</label>
            <select
              id="reading-mode"
              value={mode}
              onChange={(event) => setMode(event.target.value)}
            >
              <option value="summarize">Summarize excerpt</option>
              <option value="translate">Translate to Chinese</option>
              <option value="explain">Explain in simple English</option>
            </select>
            <button
              className="button"
              disabled={
                assist.isPending ||
                !status.data?.reading_help ||
                !session.data?.user ||
                !article.summary
              }
            >
              {assist.isPending ? 'Working on the excerpt…' : 'Process excerpt'}
            </button>
          </form>
        )}
      {article.summary.trim() && (
        <LimitNote
          allowance={status.data?.allowance ?? assist.data?.allowance}
        />
      )}
      {assist.isPending && (
        <p role="status">Processing the saved source text…</p>
      )}
      {assist.isError && (
        <div className="assistance-notice" role="alert">
          <p>{errorMessage(assist.error)}</p>
          <button
            className="quiet-action"
            onClick={() => assist.variables && assist.mutate(assist.variables)}
          >
            Try assistance again
          </button>
        </div>
      )}
      {assist.data && !assist.isPending && !assist.isError && (
        <>
          <Answer result={assist.data} />
          <details className="processed-text">
            <summary>Text used for this response</summary>
            <EvidenceList sources={assist.data.sources} />
          </details>
        </>
      )}
    </div>
  )
}

interface Quote {
  date: string
  text: string
  author: string
  work: string
  locator: string
  source_url: string
  speaker?: string
}
export function DailyQuote() {
  const quote = useQuery({
    queryKey: ['daily-quote'],
    queryFn: ({ signal }) => get<Quote>('quotes/today/', signal),
    refetchInterval: 60_000,
    retry: false,
  })
  return (
    <aside className="daily-quote" aria-label="Daily quotation">
      <div className="quote-label">Daily quotation</div>
      {quote.isPending ? (
        <p role="status">Loading today’s quotation…</p>
      ) : quote.isError ? (
        <p>
          Today’s quotation is unavailable.{' '}
          <button className="quiet-action" onClick={() => void quote.refetch()}>
            Retry quotation
          </button>
        </p>
      ) : (
        <>
          <blockquote>{quote.data.text}</blockquote>
          <p>
            <a
              className="text-link"
              href={safeExternalUrl(quote.data.source_url)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {quote.data.author} · <cite>{quote.data.work}</cite> ↗
            </a>
          </p>
          <p className="assistance-meta">
            {quote.data.locator}
            {quote.data.speaker
              ? ` · Spoken by ${quote.data.speaker}`
              : ''} · {quote.data.date} UTC · Curated rotation
          </p>
        </>
      )}
    </aside>
  )
}
