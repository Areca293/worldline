import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../account/session'
import { write } from '../lib/http'
import { timestampLabel } from '../lib/presentation'
import type { AssistanceResult } from './types'
import { useCapabilities, useAssistanceRequest, errorMessage } from './requests'
import { Availability, LimitNote, Answer, EvidenceList } from './Result'

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
  const [query, setQuery] = useState('')
  const [window, setWindow] = useState('week')
  const research = useAssistanceRequest(
    (input: { query: string; window: string }) =>
      write<AssistanceResult>('ai/research/', 'POST', input),
  )
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
