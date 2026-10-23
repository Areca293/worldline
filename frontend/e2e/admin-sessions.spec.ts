import { expect, test } from '@playwright/test'

test('admin and reader tabs retain independent accounts and CSRF tokens', async ({
  page,
  context,
}) => {
  await page.goto('/login')
  await page.getByLabel('Username').fill('browser-alice')
  await page.getByLabel('Password').fill(process.env.E2E_PASSWORD!)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByText('browser-alice', { exact: true })).toBeVisible()
  await page.goto('/articles/browser-test-story')
  await expect(
    page.getByRole('button', { name: 'Save story', exact: true }),
  ).toBeVisible()

  // Same hostname, different port: reproduces development's shared cookie jar.
  const adminURL = new URL('/admin/', process.env.API_PROXY_TARGET!)
  adminURL.hostname = '127.0.0.1'
  const admin = await context.newPage()
  await admin.goto(adminURL.href)
  await admin.getByLabel('Username').fill('browser-admin')
  await admin.getByLabel('Password').fill(process.env.E2E_PASSWORD!)
  await admin.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(admin.getByRole('button', { name: 'Log out' })).toBeVisible()

  // Save without a reload, using the reader's token from before admin login.
  await page.getByRole('button', { name: 'Save story', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Remove bookmark' }),
  ).toBeVisible()
  await page.reload()
  await expect(page.getByText('browser-alice', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Remove bookmark' }).click()
  await expect(
    page.getByRole('button', { name: 'Save story', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await admin.reload()
  await expect(admin.getByRole('button', { name: 'Log out' })).toBeVisible()
  await admin.getByRole('button', { name: 'Log out' }).click()
  await expect(
    admin.getByText('Logged out', { exact: true }).first(),
  ).toBeVisible()
})
