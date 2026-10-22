import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function signIn(page: Page, username: string) {
  await page.getByRole('link', { name: 'Sign in', exact: true }).click()
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password').fill(process.env.E2E_PASSWORD!)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
  await page.goto('/articles/browser-test-story')
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
  const original = page.getByRole('link', {
    name: /^Open original article: Browser test story/,
  })
  await expect(original).toHaveAttribute('href', 'https://example.com/story')
  await expect(original).toHaveAttribute('target', '_blank')
  const star = page
    .locator('.lead-card')
    .getByRole('link', { name: 'Sign in to save', exact: true })
  await expect(star.locator('svg')).toBeVisible()
  const starBox = await star.boundingBox()
  const dateBox = await page
    .locator('.lead-card .card-footer time')
    .boundingBox()
  expect(starBox!.width).toBeGreaterThanOrEqual(44)
  expect(
    Math.abs(
      starBox!.y + starBox!.height / 2 - dateBox!.y - dateBox!.height / 2,
    ),
  ).toBeLessThan(2)
  await expect(page.getByText('A place to begin')).toHaveCount(0)
  await expect(page.getByText('Stay informed. Stay curious.')).toHaveCount(0)
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
  const actions = page.locator('.detail-actions')
  const actionStar = await actions
    .getByRole('link', { name: 'Sign in to save' })
    .boundingBox()
  const actionOriginal = await actions
    .getByRole('link', { name: 'Read original article' })
    .boundingBox()
  expect(actionStar!.width).toBeGreaterThanOrEqual(44)
  expect(actionOriginal!.height).toBeGreaterThanOrEqual(44)
  expect(actionStar!.x + actionStar!.width).toBeLessThanOrEqual(
    actionOriginal!.x,
  )
  await page.screenshot({
    path: testInfo.outputPath('detail-actions.png'),
    fullPage: true,
  })
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

test('registers a reader, keeps the session after reload and can sign in again', async ({
  page,
}, testInfo) => {
  const username = `new-${testInfo.project.name}`
  await page.goto('/')
  await page.getByRole('link', { name: 'Register', exact: true }).click()
  await page.getByLabel('Username', { exact: true }).fill(username)
  await page
    .getByLabel('Email', { exact: true })
    .fill(`${username}@example.com`)
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.E2E_PASSWORD!)
  await page
    .getByLabel('Confirm password', { exact: true })
    .fill(process.env.E2E_PASSWORD!)
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click()
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
  await page.reload()
  await expect(page.getByText(username, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await signIn(page, username)
  await expect(page.getByText(username, { exact: true })).toBeVisible()
})

test('changes page numbers and sizes, preserves them on reload, and shows all stories', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  await page.getByLabel('Stories per page', { exact: true }).selectOption('10')
  await expect(page.locator('article')).toHaveCount(10)
  await page.getByRole('button', { name: 'Page 2', exact: true }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(
    page.getByRole('button', { name: 'Page 2', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
  await expect(
    page.getByRole('heading', { name: 'Browser test story', exact: true }),
  ).toHaveCount(0)
  await page.reload()
  await expect(
    page.getByLabel('Stories per page', { exact: true }),
  ).toHaveValue('10')
  await expect(
    page.getByRole('button', { name: 'Page 2', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
  await page
    .getByLabel('Stories per page', { exact: true })
    .selectOption('custom')
  await page.getByLabel('Custom stories per page').fill('7')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(page.locator('article')).toHaveCount(7)
  await expect(
    page.getByRole('button', { name: 'Page 1', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
  await page.getByRole('button', { name: 'Music', exact: true }).click()
  await expect(page.getByLabel('Custom stories per page')).toHaveValue('7')
  await expect(page.locator('article')).toHaveCount(7)
  await page.getByRole('button', { name: 'Page 2', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Page 2', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
  await page
    .getByRole('navigation', { name: 'Article pages' })
    .scrollIntoViewIfNeeded()
  await page.screenshot({
    path: testInfo.outputPath('numbered-pages.png'),
    fullPage: false,
  })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.getByLabel('Stories per page', { exact: true }).selectOption('all')
  await expect(page.locator('article')).toHaveCount(25)
  await expect(
    page.getByRole('navigation', { name: 'Article pages' }),
  ).toHaveCount(0)
  await page.reload()
  await expect(
    page.getByLabel('Stories per page', { exact: true }),
  ).toHaveValue('all')
  await expect(page.locator('article')).toHaveCount(25)
})

test('keeps the reading desk usable at wide, tablet and narrow widths', async ({
  page,
}, testInfo) => {
  const widths = testInfo.project.name === 'desktop' ? [1440, 768] : [390, 320]
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: 'Browser test story', exact: true }),
    ).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    expect(
      await page.evaluate(
        () =>
          document.fonts.check('16px "Archivo Variable"') &&
          document.fonts.check('16px "Literata Variable"'),
      ),
    ).toBe(true)
    const unclipped = async () => {
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true)
      expect(
        await page
          .locator('h1, h2, h3')
          .evaluateAll((headings) =>
            headings.every(
              (heading) => heading.scrollWidth <= heading.clientWidth + 1,
            ),
          ),
      ).toBe(true)
    }
    await unclipped()
    await page.screenshot({
      path: testInfo.outputPath(`home-${width}.png`),
      fullPage: false,
    })
    await page
      .getByRole('link', { name: 'Browser test story', exact: true })
      .click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Browser test story',
    )
    await expect(
      page.getByText(
        'An original fixture used only in the disposable browser-test database.',
        { exact: true },
      ),
    ).toBeVisible()
    await unclipped()
    await page.screenshot({
      path: testInfo.outputPath(`detail-${width}.png`),
      fullPage: true,
    })
    await page.getByRole('link', { name: 'Register', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Create your account.',
    )
    await page.getByLabel('Email', { exact: true }).focus()
    expect(
      await page
        .getByLabel('Email', { exact: true })
        .evaluate((element) => getComputedStyle(element).outlineStyle),
    ).toBe('solid')
    await unclipped()
    await page.screenshot({
      path: testInfo.outputPath(`register-${width}.png`),
      fullPage: true,
    })
    await page
      .getByRole('link', { name: 'Sign in', exact: true })
      .first()
      .click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Welcome back.',
    )
    await unclipped()
    await page.screenshot({
      path: testInfo.outputPath(`login-${width}.png`),
      fullPage: true,
    })
    await page.getByRole('link', { name: 'Saved stories', exact: true }).click()
    await expect(
      page.getByText('Sign in to see your saved stories.'),
    ).toBeVisible()
    await unclipped()
  }
})

test('supports keyboard entry, missing routes and reduced motion without hiding content', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeFocused()
  await expect(page.locator('.skip-link')).toHaveCSS('opacity', '1')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#main/)
  await expect(
    page.getByRole('heading', { name: 'Browser test story', exact: true }),
  ).toBeVisible()
  expect(
    await page
      .locator('.row-arrow span')
      .first()
      .evaluate((element) => getComputedStyle(element).transitionDuration),
  ).toBe('0s')
  await page.goto('/register')
  await page
    .getByLabel('Username', { exact: true })
    .fill('weak-password-reader')
  await page.getByLabel('Email', { exact: true }).fill('reader@example.com')
  await page.getByLabel('Password', { exact: true }).fill('12345678')
  await page.getByLabel('Confirm password', { exact: true }).fill('12345678')
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText('password')
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  await expect(page.locator('.skip-link')).not.toBeFocused()
  await expect(page.locator('.skip-link')).toHaveCSS('opacity', '0')
  await page.screenshot({
    path: testInfo.outputPath('registration-errors.png'),
    fullPage: true,
  })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.goto('/missing-reading-page')
  await expect(
    page.getByRole('heading', { name: 'This page is off the map.' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Return home →' }).click()
  await expect(
    page.getByRole('heading', { name: 'Browser test story', exact: true }),
  ).toBeVisible()
})
