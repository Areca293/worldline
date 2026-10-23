import { expect, test } from '@playwright/test'

// Synthetic image response only for an explicitly original disposable test story.
const imageUrl =
  'https://news.mit.edu/sites/default/files/worldline-fixture.png'
const pixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6L8AAAAASUVORK5CYII=',
  'base64',
)

test('shows typo feedback and optional image without overlapping text, then recovers from image failure', async ({
  page,
}, testInfo) => {
  await page.route(imageUrl, (route) =>
    route.fulfill({ contentType: 'image/png', body: pixel }),
  )
  await page.goto('/?q=chatgpd')
  await expect(
    page.getByText(
      'No exact matches. Showing similar spellings for “chatgpd”.',
    ),
  ).toBeVisible()
  const card = page
    .locator('article')
    .filter({ hasText: 'ChatGPT research with a publisher image' })
  const image = card.locator('img')
  await expect(image).toBeVisible()
  await expect(image).toHaveAttribute('referrerpolicy', 'no-referrer')
  await expect
    .poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0)
  for (const width of testInfo.project.name === 'desktop'
    ? [1440, 768]
    : [390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    const text = await card.locator('.card-text').boundingBox()
    const media = await card.locator('.card-media').boundingBox()
    expect(
      text!.x + text!.width <= media!.x + 1 ||
        text!.y + text!.height <= media!.y + 1,
    ).toBe(true)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  }
  await page.reload()
  await expect(page.getByRole('searchbox')).toHaveValue('chatgpd')
  await expect(image).toBeVisible()
  await page.unroute(imageUrl)
  await page.route(imageUrl, (route) => route.abort())
  await page.reload()
  await expect(card).toBeVisible()
  await expect(card.locator('.with-media')).toHaveCount(0)
  await expect(card.locator('h3')).toHaveText(
    'ChatGPT research with a publisher image',
  )
})

test('keeps sidebar controls reachable independently and source expansion out of the reading layout', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  await expect(page.locator('article').first()).toBeVisible()
  await expect(page.locator('.reading-tools .source-updates')).toHaveCount(0)
  if (testInfo.project.name === 'desktop') {
    await page.setViewportSize({ width: 1440, height: 650 })
    await page
      .locator('.reading-tools')
      .evaluate((el) => el.scrollIntoView({ block: 'start' }))
    const before = await page.evaluate(() => scrollY)
    await page.getByRole('button', { name: 'Security', exact: true }).focus()
    const box = await page
      .getByRole('button', { name: 'Security', exact: true })
      .boundingBox()
    expect(box!.y).toBeGreaterThanOrEqual(0)
    expect(box!.y + box!.height).toBeLessThanOrEqual(650)
    expect(
      Math.abs((await page.evaluate(() => scrollY)) - before),
    ).toBeLessThan(2)
  }
  await page.getByText('Source updates', { exact: true }).click()
  const source = await page.locator('.source-updates').boundingBox()
  const stream = await page.locator('.reading-desk').boundingBox()
  expect(source!.y).toBeGreaterThanOrEqual(stream!.y + stream!.height)
  await page.screenshot({
    path: testInfo.outputPath('expanded-source-panel.png'),
  })
})
