import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function signIn(page: Page, username: string) {
  await page.getByRole('link', { name: 'Sign in', exact: true }).click()
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password').fill(process.env.E2E_PASSWORD!)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
}

test('read, filter, sign in, persist a private bookmark, switch users and remove it', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByText('API & database connected')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Browser test story' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Music', exact: true }).click()
  await expect(page).toHaveURL(/topic=music/)
  await page
    .getByRole('link', { name: 'Browser test story', exact: true })
    .click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Browser test story',
  )
  await expect(
    page.getByRole('link', { name: 'Read original article' }),
  ).toHaveAttribute('href', 'https://example.com/story')
  await signIn(page, 'browser-alice')
  await page.getByRole('button', { name: 'Save story', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Remove bookmark' }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Remove bookmark' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Saved stories' }).click()
  await expect(
    page.getByRole('heading', { name: 'Browser test story' }),
  ).toBeVisible()
  await page.screenshot({
    path: testInfo.outputPath('saved-stories.png'),
    fullPage: true,
  })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.getByRole('button', { name: 'Sign out' }).click()
  await signIn(page, 'browser-bob')
  await page.getByRole('link', { name: 'Saved stories' }).click()
  await expect(page.getByText('No saved stories yet.')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Browser test story' }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Sign out' }).click()
  await signIn(page, 'browser-alice')
  await page.getByRole('link', { name: 'Saved stories' }).click()
  await page.getByRole('button', { name: 'Remove bookmark' }).click()
  await expect(page.getByText('No saved stories yet.')).toBeVisible()
  await page.reload()
  await expect(page.getByText('No saved stories yet.')).toBeVisible()
  expect(errors).toEqual([])
})
