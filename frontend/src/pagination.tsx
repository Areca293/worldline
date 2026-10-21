import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useReadingPages() {
  const [params, setParams] = useSearchParams()
  const rawSize = params.get('page_size') || '20'
  const size =
    rawSize === 'all' || /^[1-9]\d{0,8}$/.test(rawSize) ? rawSize : '20'
  const rawPage = params.get('page') || '1'
  const page =
    size === 'all' ? 1 : /^[1-9]\d{0,8}$/.test(rawPage) ? Number(rawPage) : 1
  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next)
  }
  return { size, page, update }
}

export function PageSize({
  size,
  onChange,
}: {
  size: string
  onChange: (size: string) => void
}) {
  const presets = ['10', '20', '50', '100', 'all']
  const [custom, setCustom] = useState(!presets.includes(size))
  const [amount, setAmount] = useState(size === 'all' ? '20' : size)
  return (
    <div className="page-size">
      <label htmlFor="page-size">Stories per page</label>
      <select
        id="page-size"
        value={custom ? 'custom' : size}
        onChange={(event) => {
          if (event.target.value === 'custom') setCustom(true)
          else {
            setCustom(false)
            onChange(event.target.value)
          }
        }}
      >
        {presets.map((value) => (
          <option value={value} key={value}>
            {value === 'all' ? 'All (unlimited)' : value}
          </option>
        ))}
        <option value="custom">Custom…</option>
      </select>
      {custom && (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (/^[1-9]\d{0,8}$/.test(amount)) onChange(amount)
          }}
        >
          <label htmlFor="custom-page-size" className="sr-only">
            Custom stories per page
          </label>
          <input
            id="custom-page-size"
            type="number"
            min="1"
            max="999999999"
            step="1"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <button type="submit">Apply</button>
        </form>
      )}
    </div>
  )
}

export function PageLinks({
  page,
  total,
  onChange,
  label,
}: {
  page: number
  total: number
  onChange: (page: number) => void
  label: string
}) {
  if (total <= 1) return null
  const numbers = new Set([1, total])
  for (let n = Math.max(1, page - 2); n <= Math.min(total, page + 2); n++)
    numbers.add(n)
  const sorted = [...numbers].sort((a, b) => a - b)
  return (
    <nav className="pagination" aria-label={label}>
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
      >
        ←
      </button>
      {sorted.map((n, index) => (
        <span className="page-item" key={n}>
          {index > 0 && n - sorted[index - 1] > 1 && (
            <span className="page-gap" aria-hidden="true">
              …
            </span>
          )}
          <button
            aria-label={`Page ${n}`}
            aria-current={page === n ? 'page' : undefined}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        </span>
      ))}
      <button
        disabled={page >= total}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        →
      </button>
    </nav>
  )
}
