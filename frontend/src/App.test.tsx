import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import App from './App'
import { publishedLabel, safeExternalUrl } from './api'

afterEach(() => vi.unstubAllGlobals())
function mount(path = '/') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('shows an honest error and retry action when the API fails', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
  mount()
  expect(await screen.findByRole('button', { name: /Try again/ })).toBeVisible()
  expect(screen.getByText(/Stories from official feeds/)).toBeVisible()
  expect(await screen.findByText('Connection unavailable')).toBeVisible()
})

it('shows an empty state instead of inserting fake stories', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () =>
        url.includes('auth/session')
          ? { user: null, csrfToken: 'token' }
          : url.includes('health')
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

const story = {
  id: 1,
  slug: 'music-story',
  title: 'A real source headline',
  summary: 'A source excerpt.',
  topic: { name: 'Music', slug: 'music' },
  source: { name: 'Publisher', website_url: 'https://example.com' },
  original_url: 'https://example.com/story',
  published_at: null,
  source_updated_at: null,
  collected_at: '2026-10-20T10:00:00Z',
  is_sample: false,
  featured: false,
  is_bookmarked: false,
}

function accountServer(initiallySignedIn = false) {
  let user: { id: number; username: string } | null = initiallySignedIn
    ? { id: 1, username: 'alice' }
    : null
  let bookmarked = false
  const requests: { url: string; method: string; token?: string }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, options: RequestInit = {}) => {
      const method = options.method || 'GET'
      const headers = options.headers as Record<string, string>
      requests.push({ url, method, token: headers?.['X-CSRFToken'] })
      let data: unknown
      if (url.includes('auth/session'))
        data = { user, csrfToken: 'current-token' }
      else if (url.includes('auth/login')) {
        user = { id: 1, username: 'alice' }
        data = { user, csrfToken: 'rotated-token' }
      } else if (url.includes('auth/logout')) {
        user = null
        data = { user, csrfToken: 'logout-token' }
      } else if (url.includes('/bookmark/')) {
        bookmarked = method === 'PUT'
        data = { is_bookmarked: bookmarked }
      } else if (url.includes('health')) data = { database: 'connected' }
      else if (url.includes('topics')) data = [story.topic]
      else if (url.includes('bookmarks'))
        data = {
          results: bookmarked ? [{ ...story, is_bookmarked: true }] : [],
          count: bookmarked ? 1 : 0,
          next: null,
        }
      else if (url.includes('articles/music-story/'))
        data = { ...story, is_bookmarked: !!user && bookmarked }
      else
        data = {
          results: [{ ...story, is_bookmarked: !!user && bookmarked }],
          count: 1,
          next: null,
        }
      return { ok: true, json: async () => data }
    }),
  )
  return requests
}

it('signs in with CSRF, saves a story, and removes it from the saved list', async () => {
  const requests = accountServer()
  mount('/login')
  fireEvent.change(screen.getByLabelText('Username'), {
    target: { value: 'alice' },
  })
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'test-only-password' },
  })
  fireEvent.submit(screen.getByLabelText('Password').closest('form')!)
  fireEvent.click(await screen.findByRole('button', { name: 'Save story' }))
  expect(
    await screen.findByRole('button', { name: 'Remove bookmark' }),
  ).toBeVisible()
  fireEvent.click(screen.getByRole('link', { name: 'Saved stories' }))
  expect(await screen.findByText('Worth coming back to.')).toBeVisible()
  fireEvent.click(
    await screen.findByRole('button', { name: 'Remove bookmark' }),
  )
  expect(await screen.findByText('No saved stories yet.')).toBeVisible()
  expect(
    requests
      .filter((r) => r.method !== 'GET')
      .every((r) => r.token === 'current-token'),
  ).toBe(true)
})

it('clears saved views on sign out and shows the signed-out collection gate', async () => {
  accountServer(true)
  mount()
  fireEvent.click(await screen.findByRole('button', { name: 'Save story' }))
  await screen.findByRole('button', { name: 'Remove bookmark' })
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
  await waitFor(() =>
    expect(
      screen.queryByRole('button', { name: 'Remove bookmark' }),
    ).not.toBeInTheDocument(),
  )
  fireEvent.click(screen.getByRole('link', { name: 'Saved stories' }))
  expect(
    await screen.findByText('Sign in to see your saved stories.'),
  ).toBeVisible()
  expect(screen.queryByText('A real source headline')).not.toBeInTheDocument()
})

it('keeps a failed save visible as an error instead of claiming success', async () => {
  accountServer(true)
  const fetchBefore = globalThis.fetch
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options?: RequestInit) =>
      url.includes('/bookmark/')
        ? Promise.resolve({ ok: false, status: 503 })
        : fetchBefore(url, options),
    ),
  )
  mount('/articles/music-story')
  fireEvent.click(await screen.findByRole('button', { name: 'Save story' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'couldn’t complete your request',
  )
  expect(screen.getByRole('button', { name: 'Save story' })).toBeVisible()
})
