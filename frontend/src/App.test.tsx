import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import App from './App'
import { publishedLabel, safeExternalUrl } from './api'

afterEach(() => vi.unstubAllGlobals())
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('shows an honest error and retry action when the API fails', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
  mount()
  expect(await screen.findByRole('button', { name: /Try again/ })).toBeVisible()
  expect(screen.getByText(/sample stories/)).toBeVisible()
  expect(await screen.findByText('Connection unavailable')).toBeVisible()
})

it('shows an empty state instead of inserting fake stories', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () =>
        url.includes('health')
          ? { database: 'connected' }
          : url.includes('topics')
            ? []
            : { results: [], count: 0, next: null },
    })),
  )
  mount()
  expect(await screen.findByText('A fresh page.')).toBeVisible()
  expect(
    screen.queryByText('A closer look at the ideas shaping our digital world'),
  ).not.toBeInTheDocument()
})

it('keeps missing publication dates explicit and blocks unsafe external URLs', () => {
  expect(publishedLabel(null)).toBe('Publication date unavailable')
  expect(safeExternalUrl('javascript:alert(1)')).toBeUndefined()
  expect(safeExternalUrl('https://example.com/story')).toBe(
    'https://example.com/story',
  )
})
