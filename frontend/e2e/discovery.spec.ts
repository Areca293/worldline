import { expect, test } from '@playwright/test'

test('searches collected stories with URL pagination and clear empty states', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  await page.getByRole('searchbox', { name: 'Search stories' }).fill('archive')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Search results' }),
  ).toBeVisible()
  await expect(page.getByText('24 matching stories')).toBeVisible()
  await page.getByLabel('Stories per page', { exact: true }).selectOption('10')
  await page.getByRole('button', { name: 'Page 2', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Page 2', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
  await page.reload()
  await expect(page.getByRole('searchbox')).toHaveValue('archive')
  await expect(
    page.getByRole('button', { name: 'Page 2', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
  await page.getByRole('button', { name: 'Music', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Page 1', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
  await page.getByRole('searchbox').fill('notfoundanywhere')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByText('No matching stories.')).toBeVisible()
  await page.screenshot({
    path: testInfo.outputPath('search-empty.png'),
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Clear search' }).click()
  await expect(
    page.getByRole('link', { name: 'Browser test story', exact: true }),
  ).toBeVisible()
  await page.getByText('Source updates', { exact: true }).click()
  await expect(page.getByText('No successful update recorded.')).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})

test('shows offline and server errors and can retry after recovery', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('link', { name: 'Browser test story', exact: true }),
  ).toBeVisible()
  await context.setOffline(true)
  await expect(
    page.getByText(
      'You’re offline. Reconnect to load stories or change your saved collection.',
    ),
  ).toBeVisible()
  await page.getByRole('searchbox').fill('archive')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByRole('button', { name: /Try again/ })).toBeVisible()
  await context.setOffline(false)
  await page.getByRole('button', { name: /Try again/ }).click()
  await expect(page.getByText('24 matching stories')).toBeVisible()
  // A synthetic 503 here tests only the browser's error view, not database health.
  await page.route('**/api/articles/?**', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        detail: 'Content is temporarily unavailable. Please try again later.',
      }),
    }),
  )
  await page.getByRole('searchbox').fill('space')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(
    page.getByText(
      'We couldn’t load this content. Check your connection and try again.',
    ),
  ).toBeVisible()
  await page.unroute('**/api/articles/?**')
  await page.getByRole('button', { name: /Try again/ }).click()
  await expect(page.getByText('No matching stories.')).toBeVisible()
})
