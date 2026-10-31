import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../account/session'
import { write } from '../lib/http'
import { safeExternalUrl } from '../lib/presentation'
import type { Article } from '../reading/types'
import type { AssistanceResult } from './types'
import { useCapabilities, useAssistanceRequest, errorMessage } from './requests'
import { Availability, LimitNote, Answer, EvidenceList } from './Result'

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
  const [mode, setMode] = useState('summarize')
  const assist = useAssistanceRequest((chosen: string) =>
    write<AssistanceResult>(`ai/articles/${article.slug}/`, 'POST', {
      mode: chosen,
    }),
  )
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
