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

test('a link made for one recipient opens the landing page under its own address', async ({ page }) => {
  await asVisitor(page)
  await open(page, '/for/acme?tourVoice=silent')
  // The address stays put, so the analytics record the visit as /for/acme.
  expect(new URL(page.url()).pathname).toBe('/for/acme')
  await expect(analyticsScript(page)).toHaveCount(1)
  await page.getByRole('button', { name: /^Play the tour · \d+ min$/ }).click()
  await expect(page).toHaveURL(/\/operations\?tour=open$/)
})

test('a tour link made for one recipient opens the walkthrough and is recorded at its own address', async ({
  page,
}) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }))
  // A stand-in for Vercel's script: it reports its first page view through the page's beforeSend.
  await page.route(/\/script\.js$/, (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `const hook = (window.vaq || []).find(([name]) => name === 'beforeSend')?.[1] ?? ((e) => e)
        window.__reported = hook({ type: 'pageview', url: location.href })?.url`,
    }),
  )
  await page.goto('/for/recipient?tour=open')
  await expect(page.locator('[data-tour="welcome"]')).toBeVisible({ timeout: 10_000 })
  // The tour has moved on to its first screen...
  await expect(page).toHaveURL(/\/operations\?tour=open$/)
  // ...but the visit is recorded at the link that was opened.
  await expect.poll(() => page.evaluate(() => (window as { __reported?: string }).__reported)).toMatch(
    /\/for\/recipient\?tour=open$/,
  )
})

test('an automated browser loads no analytics', async ({ page }) => {
  await open(page, '/')
  expect(await analyticsScript(page).count()).toBe(0)
})
