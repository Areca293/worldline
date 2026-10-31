import { useQuery } from '@tanstack/react-query'
import { get } from '../lib/http'
import { safeExternalUrl } from '../lib/presentation'

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
