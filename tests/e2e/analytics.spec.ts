import { expect, test, type Page } from '@playwright/test'

/** The visitor analytics script, once the page has added it. */
const analyticsScript = (page: Page) => page.locator('script[data-sdkn^="@vercel/analytics"]')

/**
 * Plays an ordinary visitor: the browser doesn't report itself as automated. The script itself
 * never loads, so a run against the live URL (`BASE_URL`) sends nothing.
 */
async function asVisitor(page: Page) {
  await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }))
  await page.route(/\/script\.js$/, (route) => route.abort())
}

/** Opens a page and waits until it has rendered and run its effects. */
async function open(page: Page, url: string) {
  await page.goto(url)
  await expect(page.getByRole('heading', { level: 1, name: 'Agent Control Plane' })).toBeVisible()
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

test('an ordinary visitor loads the analytics script', async ({ page }) => {
  await asVisitor(page)
  await open(page, '/')
  await expect(analyticsScript(page)).toHaveCount(1)
})

test('?notrack keeps this browser out of the analytics until ?track', async ({ page }) => {
  await asVisitor(page)
  await open(page, '/?notrack')
  expect(await analyticsScript(page).count()).toBe(0)
  await open(page, '/')
  expect(await analyticsScript(page).count()).toBe(0)
  await open(page, '/?track')
  await expect(analyticsScript(page)).toHaveCount(1)
})

test('an automated browser loads no analytics', async ({ page }) => {
  await open(page, '/')
  expect(await analyticsScript(page).count()).toBe(0)
})
