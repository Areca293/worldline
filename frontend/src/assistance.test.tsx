// Synthetic API replies verify UI states, not real model quality or access.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { DailyQuote, ReadingAssistance, Research } from './assistance'
import type { AssistanceResult } from './assistance'
import type { Article } from './api'

afterEach(() => vi.unstubAllGlobals())
const allowance = { remaining: 9, daily_limit: 10, resets: '00:00 UTC' }
const result: AssistanceResult = {
  answer: {
    paragraphs: [{ text: 'The trial included 12 people.', source_ids: [1] }],
    limitations: 'Only a snippet was available.',
    evidence_sufficient: true,
  },
  sources: [
    {
      id: 1,
      title: 'Original fixture study',
      url: 'https://example.com/study',
      publisher: 'example.com',
      text: 'A preliminary trial with 12 people.',
      published_at: null,
      kind: 'search_snippet',
    },
  ],
  answer_status: 'complete',
  message: '',
  cached: false,
  retrieved_at: '2026-10-23T10:00:00Z',
  generated_at: '2026-10-23T10:00:01Z',
  allowance,
  window: 'week',
}
function server({ configured = true, reply = result, status = 200 } = {}) {
  const fetcher = vi.fn(async (url: string, options: RequestInit = {}) => {
    let data: unknown
    if (url.includes('auth/session'))
      data = { user: { id: 1, username: 'reader' }, csrfToken: 'test-token' }
    else if (url.includes('ai/status'))
      data = {
        web_search: configured,
        answers: configured,
        reading_help: configured,
        allowance,
      }
    else if (options.method === 'POST')
      return {
        ok: status === 200,
        status,
        json: async () =>
          status === 200
            ? reply
            : {
                code: 'daily_limit',
                detail: 'The daily assistance limit has been reached.',
              },
      }
    return { ok: true, json: async () => data }
  })
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}
function mount(component = <Research />) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{component}</MemoryRouter>
    </QueryClientProvider>,
  )
  return client
}
async function submit() {
  fireEvent.change(await screen.findByLabelText('Research question'), {
    target: { value: 'What does the trial show?' },
  })
  const button = screen.getByRole('button', { name: 'Search the web' })
  await waitFor(() => expect(button).toBeEnabled())
  fireEvent.click(button)
}

it('keeps unconfigured research honest without sending a provider request', async () => {
  const fetcher = server({ configured: false })
  mount()
  expect(
    await screen.findByText(/Web research is not configured/),
  ).toBeVisible()
  expect(screen.getByRole('button', { name: 'Search the web' })).toBeDisabled()
  expect(fetcher.mock.calls.every(([, options]) => !options?.method)).toBe(true)
})

it('submits explicitly with CSRF and shows evidence links and actual retrieval time', async () => {
  const fetcher = server()
  mount()
  await submit()
  expect(await screen.findByText('The trial included 12 people.')).toBeVisible()
  expect(screen.getByRole('link', { name: /Source 1:/ })).toHaveAttribute(
    'href',
    'https://example.com/study',
  )
  expect(screen.getByText(/Retrieved Oct 23, 2026/)).toBeVisible()
  expect(screen.getByText('Publication date unavailable')).toBeVisible()
  const call = fetcher.mock.calls.find(
    ([, options]) => options?.method === 'POST',
  )!
  expect(JSON.parse(call[1]!.body as string)).toEqual({
    query: 'What does the trial show?',
    window: 'week',
  })
  expect(call[1]!.headers).toHaveProperty('X-CSRFToken', 'test-token')
})

it('keeps sources visible when the model fails and does not claim generated success', async () => {
  server({
    reply: {
      ...result,
      answer: null,
      answer_status: 'timeout',
      generated_at: null,
      message: 'The provider timed out.',
    },
  })
  mount()
  await submit()
  expect(await screen.findByText('The provider timed out.')).toBeVisible()
  expect(screen.getByText('No AI answer')).toBeVisible()
  expect(
    screen.getByRole('link', { name: /Original fixture study/ }),
  ).toBeVisible()
  expect(
    screen.queryByText('The trial included 12 people.'),
  ).not.toBeInTheDocument()
})

it('shows no-results and quota states without manufacturing answers', async () => {
  server({
    reply: {
      ...result,
      answer: null,
      sources: [],
      answer_status: 'no_results',
    },
  })
  mount()
  await submit()
  expect(await screen.findByText(/No results for this question/)).toBeVisible()
  server({ status: 429 })
  await submit()
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'daily assistance limit',
  )
  expect(
    screen.getByRole('button', { name: 'Try research again' }),
  ).toBeVisible()
  expect(
    screen.queryByText('The trial included 12 people.'),
  ).not.toBeInTheDocument()
})

it('discards private question and result when the account changes', async () => {
  server()
  const client = mount()
  await submit()
  await screen.findByText('The trial included 12 people.')
  act(() =>
    client.setQueryData(['session'], {
      user: { id: 2, username: 'other' },
      csrfToken: 'other-token',
    }),
  )
  await waitFor(() =>
    expect(screen.getByLabelText('Research question')).toHaveValue(''),
  )
  expect(
    screen.queryByText('The trial included 12 people.'),
  ).not.toBeInTheDocument()
})

it('requests a translation by stored article slug and identifies its text scope', async () => {
  const fetcher = server({
    reply: {
      ...result,
      mode: 'translate',
      retrieved_at: null,
      answer: {
        ...result.answer!,
        paragraphs: [{ text: '该试验有12名参与者。', source_ids: [1] }],
      },
    },
  })
  mount(
    <ReadingAssistance
      article={
        {
          id: 1,
          slug: 'original-study',
          summary: 'Original excerpt.',
          is_sample: false,
        } as Article
      }
    />,
  )
  fireEvent.click(screen.getByText('Reading assistance'))
  fireEvent.change(await screen.findByLabelText('Reading task'), {
    target: { value: 'translate' },
  })
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Process excerpt' }),
    ).toBeEnabled(),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Process excerpt' }))
  expect(await screen.findByText('该试验有12名参与者。')).toHaveAttribute(
    'lang',
    'zh-Hans',
  )
  const call = fetcher.mock.calls.find(
    ([, options]) => options?.method === 'POST',
  )!
  expect(call[0]).toBe('/api/ai/articles/original-study/')
  expect(JSON.parse(call[1]!.body as string)).toEqual({ mode: 'translate' })
  expect(screen.getByText(/never an unavailable full article/)).toBeVisible()
})

it('does not offer processing for missing excerpts', async () => {
  server()
  mount(
    <ReadingAssistance
      article={
        { id: 1, slug: 'empty', summary: '', is_sample: false } as Article
      }
    />,
  )
  fireEvent.click(screen.getByText('Reading assistance'))
  expect(
    await screen.findByText(/There is no source excerpt to process/),
  ).toBeVisible()
  expect(screen.getByRole('button', { name: 'Process excerpt' })).toBeDisabled()
})

it('shows quotation failure with retry instead of inventing a quote', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
  mount(<DailyQuote />)
  expect(
    await screen.findByRole('button', { name: 'Retry quotation' }),
  ).toBeVisible()
})
