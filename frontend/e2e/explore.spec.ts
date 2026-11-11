import { expect, test } from '@playwright/test'

test('keeps navigation, local search and explicit web research separate', async ({
  page,
}, testInfo) => {
  let researchCalls = 0
  page.on('request', (request) => {
    if (request.url().includes('/api/ai/research/')) researchCalls++
  })
  await page.goto('/?page_size=1&page=2')
  const business = page.getByRole('navigation', {
    name: 'Reading and research',
  })
  await expect(
    business.getByRole('link', { name: 'Web research' }),
  ).toBeInViewport()
  await expect(
    page.getByRole('searchbox', { name: 'Search stories' }),
  ).toBeInViewport()
  await expect(
    page
      .getByRole('navigation', { name: 'Your account' })
      .getByRole('link', { name: 'Saved stories' }),
  ).toHaveCount(0)
  const projects = page.getByRole('button', { name: 'Projects', exact: true })
  await projects.focus()
  await page.keyboard.press('Enter')
  await expect(projects).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByRole('button', { name: 'Most stars', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByRole('button', { name: 'Page 1', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
  await page.getByRole('searchbox', { name: 'Search projects' }).fill('fixture')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page.getByRole('button', { name: 'Star growth', exact: true }).click()
  await expect(page.getByText('1 matching project')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('searchbox')).toHaveValue('fixture')
  await page.getByRole('button', { name: 'Stories', exact: true }).click()
  await expect(
    page.getByRole('searchbox', { name: 'Search stories' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Star growth', exact: true }),
  ).toHaveCount(0)
  await page.goBack()
  await expect(
    page.getByRole('button', { name: 'Star growth', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.goForward()
  await expect(
    page.getByRole('button', { name: 'Stories', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await business.getByRole('link', { name: 'Web research' }).click()
  await expect(page).toHaveURL(/\/research$/)
  expect(researchCalls).toBe(0)
  await page.goto('/?sort=growth')
  await expect(
    page.getByRole('button', { name: 'Projects', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByRole('button', { name: 'Star growth', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.screenshot({
    path: testInfo.outputPath('explore.png'),
    fullPage: false,
  })
})

test('scrolls desktop filters by keyboard, wheel and draggable scrollbar', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await page.setViewportSize({ width: 1280, height: 600 })
  await page.goto('/?type=projects')
  const sidebar = page.getByRole('complementary', { name: 'Explore filters' })
  await sidebar.scrollIntoViewIfNeeded()
  await sidebar.focus()
  await page.keyboard.press('End')
  await expect
    .poll(() => sidebar.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0)
  await page.keyboard.press('Home')
  await expect.poll(() => sidebar.evaluate((el) => el.scrollTop)).toBe(0)
  await sidebar.hover()
  await page.mouse.wheel(0, 200)
  await expect
    .poll(() => sidebar.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0)
  await sidebar.evaluate((el) => {
    el.scrollTop = 0
  })
  const box = (await sidebar.boundingBox())!
  await page.mouse.move(box.x + box.width - 6, box.y + 30)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width - 6, box.y + box.height - 30, {
    steps: 15,
  })
  await page.mouse.up()
  await expect
    .poll(() => sidebar.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0)
})
