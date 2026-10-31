import { safeExternalUrl, timestampLabel } from '../lib/presentation'
import type { Allowance, Evidence, AssistanceResult } from './types'
import type { useCapabilities } from './requests'

export function Availability({
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

export function LimitNote({
  allowance,
}: {
  allowance: Allowance | null | undefined
}) {
  return allowance ? (
    <p className="assistance-meta">
      {allowance.remaining} of {allowance.daily_limit} requests left today ·
      resets {allowance.resets}. Uncached attempts count, including failures.
    </p>
  ) : null
}

export function EvidenceList({ sources }: { sources: Evidence[] }) {
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

export function Answer({ result }: { result: AssistanceResult }) {
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
