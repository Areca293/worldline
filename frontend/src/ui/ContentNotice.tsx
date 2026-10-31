import { Link } from 'react-router-dom'

export function Notice({ retry }: { retry: () => void }) {
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

export function NotFound() {
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
