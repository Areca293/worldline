import { expect, test } from '@playwright/test'

test('reading failures stay visible without replacing the stored excerpt', async ({
  page,
}) => {
  // Explicit HTTP error fixtures exercise the UI, not real model generation.
  await page.route('**/api/auth/session/', (route) =>
    route.fulfill({
      json: { user: { id: 999, username: 'UI-fixture' }, csrfToken: 'fixture' },
    }),
  )
  await page.route('**/api/ai/status/', (route) =>
    route.fulfill({
      json: {
        web_search: false,
        answers: false,
        reading_help: true,
        allowance: null,
      },
    }),
  )
  let failure = {
    status: 502,
    detail:
      'The answer could not be verified against its sources. Please try again.',
  }
  await page.route('**/api/ai/articles/browser-test-story/', (route) =>
    route.fulfill({
      status: failure.status,
      json: { detail: failure.detail },
    }),
  )
  await page.goto('/articles/browser-test-story')
  await page.getByText('Reading assistance', { exact: true }).click()
  await page.getByRole('button', { name: 'Process excerpt' }).click()
  await expect(page.getByRole('alert')).toContainText('could not be verified')
  await expect(
    page.getByText(
      'An original fixture used only in the disposable browser-test database.',
      { exact: true },
    ),
  ).toBeVisible()
  failure = { status: 504, detail: 'The provider timed out. Please try again.' }
  await page.getByRole('button', { name: 'Try assistance again' }).click()
  await expect(page.getByRole('alert')).toContainText('timed out')
  await expect(page.getByText('AI-generated', { exact: false })).toHaveCount(0)
})

test('unconfigured M3 keeps real reading and verified quotations available', async ({
  page,
}, testInfo) => {
  await page.goto('/research')
  await expect(page.getByText(/Web research is not configured/)).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Search the web' }),
  ).toHaveCount(0)
  for (const width of testInfo.project.name === 'desktop'
    ? [1440, 768]
    : [390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await page.screenshot({
      path: testInfo.outputPath(`research-unconfigured-${width}.png`),
    })
  }
  await page
    .getByRole('link', { name: 'Search collected stories', exact: false })
    .click()
  const quote = page.getByRole('complementary', { name: 'Daily quotation' })
  await expect(quote.locator('blockquote')).not.toBeEmpty()
  await expect(quote.getByRole('link')).toHaveAttribute(
    'href',
    /https:\/\/www.gutenberg.org\/files\//,
  )
  await page.goto('/articles/browser-test-story')
  await page.getByText('Reading assistance', { exact: true }).click()
  await expect(
    page.getByText(/Reading assistance is not configured/),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Process excerpt' }),
  ).toHaveCount(0)
  await expect(
    page.getByText(
      'An original fixture used only in the disposable browser-test database.',
      { exact: true },
    ),
  ).toBeVisible()
})

test('synthetic research response exercises citations, failures and responsive evidence layout', async ({
  page,
}, testInfo) => {
  // UI-only provider simulation. Never used by the normal application/backend.
  const allowance = { remaining: 9, daily_limit: 10, resets: '00:00 UTC' }
  await page.route('**/api/auth/session/', (route) =>
    route.fulfill({
      json: { user: { id: 999, username: 'UI-fixture' }, csrfToken: 'fixture' },
    }),
  )
  await page.route('**/api/ai/status/', (route) =>
    route.fulfill({
      json: { web_search: true, answers: true, reading_help: true, allowance },
    }),
  )
  let fail = false
  await page.route('**/api/ai/research/', (route) =>
    route.fulfill(
      fail
        ? {
            status: 429,
            json: { detail: 'The daily assistance limit has been reached.' },
          }
        : {
            json: {
              sources: [
                {
                  id: 1,
                  title:
                    'Original browser fixture with a deliberately long source title about a preliminary research finding',
                  url: 'https://example.com/research',
                  publisher: 'example.com',
                  text: 'An original test passage about 12 participants. Findings are preliminary.',
                  kind: 'search_snippet',
                  published_at: null,
                },
              ],
              answer: {
                evidence_sufficient: true,
                paragraphs: [
                  {
                    text: 'The preliminary fixture trial included 12 participants.',
                    source_ids: [1],
                  },
                ],
                limitations:
                  'Only the synthetic fixture snippet was available.',
              },
              answer_status: 'complete',
              message: '',
              retrieved_at: '2026-10-23T10:00:00Z',
              generated_at: '2026-10-23T10:00:01Z',
              cached: false,
              window: 'week',
              allowance,
            },
          },
    ),
  )
  await page.goto('/research')
  await page
    .getByLabel('Research question')
    .fill('What does the fixture trial show?')
  await page.getByRole('button', { name: 'Search the web' }).click()
  await expect(
    page.getByText('The preliminary fixture trial included 12 participants.'),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: /^Source 1:/ })).toHaveAttribute(
    'href',
    'https://example.com/research',
  )
  for (const width of testInfo.project.name === 'desktop'
    ? [1440, 768]
    : [390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await page.locator('.research-results').scrollIntoViewIfNeeded()
    await page.screenshot({
      path: testInfo.outputPath(`research-fixture-${width}.png`),
    })
  }
  fail = true
  allowance.remaining = 0
  await page.getByRole('button', { name: 'Search the web' }).click()
  await expect(page.getByRole('alert')).toContainText('daily assistance limit')
  await expect(page.getByText(/0 of 10 requests left today/)).toBeVisible()
  await expect(
    page.getByText('The preliminary fixture trial included 12 participants.'),
  ).toHaveCount(0)
})

test('empty excerpts offer the original article instead of an unusable form', async ({
  page,
}) => {
  // Explicit UI fixture; no normal article or account is changed.
  await page.route('**/api/articles/browser-test-story/', async (route) => {
    const response = await route.fetch()
    await route.fulfill({
      json: { ...(await response.json()), summary: '   ' },
    })
  })
  let submitted = false
  await page.route('**/api/ai/articles/**', (route) => {
    submitted = true
    return route.abort()
  })
  await page.goto('/articles/browser-test-story')
  await page.getByText('Reading assistance', { exact: true }).click()
  await expect(
    page.getByText('Reading assistance is unavailable for this story.'),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Process excerpt' }),
  ).toHaveCount(0)
  await expect(page.getByLabel('Reading task')).toHaveCount(0)
  await expect(
    page.getByRole('link', { name: 'Open original article', exact: false }),
  ).toHaveAttribute('href', 'https://example.com/story')
  expect(submitted).toBe(false)
})

test('availability can recover from missing configuration and a failed status request', async ({
  page,
}) => {
  await page.route('**/api/auth/session/', (route) =>
    route.fulfill({
      json: { user: { id: 999, username: 'UI-fixture' }, csrfToken: 'fixture' },
    }),
  )
  let state = 'missing'
  await page.route('**/api/ai/status/', (route) =>
    state === 'error'
      ? route.fulfill({ status: 503, json: { detail: 'Fixture unavailable' } })
      : route.fulfill({
          json: {
            web_search: state === 'ready',
            answers: false,
            reading_help: state === 'ready',
            allowance: null,
          },
        }),
  )
  await page.goto('/research')
  await expect(
    page.getByText(/A Brave Search connection is required/),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Search the web' }),
  ).toHaveCount(0)
  state = 'error'
  await page.getByRole('button', { name: 'Check availability again' }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Assistance status is unavailable',
  )
  state = 'ready'
  await page.getByRole('button', { name: 'Retry status' }).click()
  await expect(
    page.getByRole('button', { name: 'Search the web' }),
  ).toBeEnabled()
  await expect(page.getByText(/AI answers are not configured/)).toBeVisible()
  await page.goto('/articles/browser-test-story')
  await page.getByText('Reading assistance', { exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Process excerpt' }),
  ).toBeEnabled()
})

test('configured assistance directs anonymous readers to sign in', async ({
  page,
}) => {
  await page.route('**/api/ai/status/', (route) =>
    route.fulfill({
      json: {
        web_search: true,
        answers: true,
        reading_help: true,
        allowance: null,
      },
    }),
  )
  await page.goto('/research')
  await expect(
    page.getByRole('link', { name: 'Sign in to research' }),
  ).toHaveAttribute('href', '/login?next=%2Fresearch')
  await expect(
    page.getByRole('button', { name: 'Search the web' }),
  ).toHaveCount(0)
  await page.goto('/articles/browser-test-story')
  await page.getByText('Reading assistance', { exact: true }).click()
  await expect(
    page.getByRole('link', { name: 'Sign in to use reading assistance' }),
  ).toHaveAttribute('href', '/login?next=%2Farticles%2Fbrowser-test-story')
  await expect(
    page.getByRole('button', { name: 'Process excerpt' }),
  ).toHaveCount(0)
})
