import { expect, test } from '@playwright/test'

test('explores ten topics and distinguishes measured growth from pending or stale data', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  await expect(
    page
      .getByRole('navigation', { name: 'Filter by topic' })
      .getByRole('button'),
  ).toHaveCount(11)
  await page
    .getByRole('button', { name: 'Agents & Skills', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Agents & Skills', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(page).toHaveURL(/topic=agents-skills/)
  await page.getByLabel('Explore', { exact: true }).selectOption('stars')
  await expect(
    page.getByText('120 GitHub stars', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('Growth: collecting a full day of observations.'),
  ).toBeVisible()
  await page.getByLabel('Explore', { exact: true }).selectOption('growth')
  await expect(
    page.getByRole('heading', {
      name: 'No comparable growth observations yet.',
    }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Browse total stars' }).click()
  await expect(page.getByLabel('Explore', { exact: true })).toHaveValue('stars')
  await page.reload()
  await expect(page.getByLabel('Explore', { exact: true })).toHaveValue('stars')
  await expect(
    page.getByRole('button', { name: 'Agents & Skills', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'All topics' }).click()
  await expect(page.locator('article').first()).toContainText(
    'fixture/stale-project',
  )
  await expect(
    page.getByText('Snapshot outdated. Growth unavailable.'),
  ).toBeVisible()
  await page.getByLabel('Explore', { exact: true }).selectOption('growth')
  await expect(page.locator('article')).toHaveCount(1)
  await expect(page.getByText('+30 stars over 24.0h')).toBeVisible()
  await page.getByRole('searchbox').fill('growing')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByText('1 matching project')).toBeVisible()
  await page
    .getByRole('link', { name: 'fixture/growing-project', exact: true })
    .click()
  await expect(
    page.getByText('Repository created', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('Comparison baseline', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Open repository' }),
  ).toHaveAttribute('href', 'https://github.com/fixture/growing-project')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: testInfo.outputPath('repository-details.png'),
    fullPage: true,
  })
})
