export function readExplore(params: URLSearchParams) {
  const requested = params.get('type')
  const legacySort = params.get('sort')
  const type =
    requested === 'projects' ||
    (requested !== 'stories' &&
      (legacySort === 'stars' || legacySort === 'growth'))
      ? 'projects'
      : 'stories'
  const sort =
    type === 'projects' ? (legacySort === 'growth' ? 'growth' : 'stars') : ''
  return { type, sort }
}

export function ExploreFilters({
  type,
  sort,
  update,
}: {
  type: string
  sort: string
  update: (changes: Record<string, string>) => void
}) {
  return (
    <div className="reading-options">
      <div className="filter-group" role="group" aria-label="Explore">
        <span>Explore</span>
        <div className="segmented-control">
          {['stories', 'projects'].map((value) => (
            <button
              key={value}
              aria-pressed={type === value}
              onClick={() =>
                update({
                  type: value,
                  sort: value === 'projects' ? 'stars' : '',
                  page: '',
                })
              }
            >
              {value === 'stories' ? 'Stories' : 'Projects'}
            </button>
          ))}
        </div>
      </div>
      {type === 'projects' && (
        <div className="filter-group" role="group" aria-label="Project order">
          <span>Project order</span>
          <div className="project-order">
            {['stars', 'growth'].map((value) => (
              <button
                key={value}
                aria-pressed={sort === value}
                onClick={() => update({ sort: value, page: '' })}
              >
                {value === 'stars' ? 'Most stars' : 'Star growth'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
