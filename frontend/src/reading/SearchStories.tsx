import { useState } from 'react'

export function SearchStories({
  query,
  onSearch,
  saved = false,
}: {
  query: string
  onSearch: (value: string) => void
  saved?: boolean
}) {
  const [draft, setDraft] = useState(query)
  return (
    <form
      className="story-search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        onSearch(draft.trim())
      }}
    >
      <label htmlFor="story-query">
        {saved ? 'Search saved stories' : 'Search stories'}
      </label>
      <div className="search-controls">
        <input
          id="story-query"
          type="search"
          value={draft}
          maxLength={200}
          aria-describedby="search-scope"
          placeholder="e.g. Claude, skills, Mistral"
          onChange={(event) => setDraft(event.target.value)}
        />
        <button className="button" type="submit">
          Search
        </button>
        {query && (
          <button
            className="clear-search"
            type="button"
            onClick={() => {
              setDraft('')
              onSearch('')
            }}
          >
            Clear search
          </button>
        )}
      </div>
      <p id="search-scope">
        {saved
          ? 'Search titles and excerpts in your collection.'
          : 'Search collected titles, descriptions and publisher names.'}
      </p>
      {query.length > 200 && <p role="alert">Use at most 200 characters.</p>}
    </form>
  )
}
