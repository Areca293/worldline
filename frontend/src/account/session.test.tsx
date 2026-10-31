import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { expect, it } from 'vitest'
import { useAccountChange } from './session'

it('cancels in-flight private reads before removing every account-scoped cache', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  for (const key of ['articles', 'article', 'bookmarks', 'assistance-status']) {
    client.setQueryData([key, 1], { private: 'first reader' })
  }
  client.setQueryData(['topics'], ['Music'])
  client.setQueryData(['daily-quote'], { text: 'Public quotation' })
  let aborted = false
  let resolve!: (value: unknown) => void
  const pending = client
    .fetchQuery({
      queryKey: ['article', 1, 'pending'],
      queryFn: ({ signal }) => {
        signal.addEventListener('abort', () => {
          aborted = true
        })
        return new Promise((done) => {
          resolve = done
        })
      },
    })
    .catch(() => undefined)
  const { result } = renderHook(() => useAccountChange(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })
  const session = {
    user: { id: 2, username: 'second' },
    csrfToken: 'new-token',
  }
  await act(() => result.current(session))
  expect(aborted).toBe(true)
  resolve({ private: 'late answer' })
  await pending
  for (const key of ['articles', 'article', 'bookmarks', 'assistance-status']) {
    expect(client.getQueriesData({ queryKey: [key] })).toEqual([])
  }
  expect(client.getQueryData(['session'])).toEqual(session)
  expect(client.getQueryData(['topics'])).toEqual(['Music'])
  expect(client.getQueryData(['daily-quote'])).toEqual({
    text: 'Public quotation',
  })
  client.clear()
})
