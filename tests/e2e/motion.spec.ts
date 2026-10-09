import { expect, test, type Locator, type Page } from '@playwright/test'
import { STORIES, stepHref } from '../../src/prototype/stories'

const story = (id: string) => STORIES.find((s) => s.id === id)!
const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY))
const scrollTo = (page: Page, y: number) => page.evaluate((top) => window.scrollTo(0, top), y)
/** Clicks without Playwright scrolling the element into view first, so the page stays where the test put it. */
const press = (locator: Locator) => locator.evaluate((el) => (el as HTMLElement).click())

test.describe('scroll position (R8, Review focus 3)', () => {
  test('a link from low on a long page opens the next page at its top', async ({ page }) => {
    await page.goto('/inventory')
    const rows = page.locator('[data-row-id]')
    await press(rows.last())
    await expect(page).toHaveURL(/agent=/)
    await scrollTo(page, 100_000)
    expect(await scrollY(page)).toBeGreaterThan(1000)
    await press(page.getByRole('link', { name: 'Open record' }))
    await expect(page).toHaveURL(/\/inventory\/agents\/[^/?]+$/)
    await expect.poll(() => scrollY(page)).toBe(0)
  })

  test('selecting a row on the same page leaves the page where it is', async ({ page }) => {
    await page.goto('/inventory')
    await scrollTo(page, 1000)
    const before = await scrollY(page)
    await press(page.locator('[data-row-id]').nth(25))
    await expect(page).toHaveURL(/agent=/)
    await page.waitForTimeout(200)
    expect(await scrollY(page)).toBe(before)
  })

  test('switching a tab leaves the page where it is', async ({ page }) => {
    await page.goto('/operations/agents/med-rec')
    await scrollTo(page, 150)
    const before = await scrollY(page)
    expect(before).toBeGreaterThan(100)
    await press(page.getByRole('link', { name: 'Scorecard' }))
    await expect(page).toHaveURL(/tab=scorecard/)
    await page.waitForTimeout(200)
    // Scroll anchoring may nudge it by a pixel or two as the tab's content changes.
    expect(Math.abs((await scrollY(page)) - before)).toBeLessThanOrEqual(2)
  })

  test('Back returns to where the visitor was', async ({ page }) => {
    await page.goto('/inventory')
    await press(page.locator('[data-row-id]').nth(20))
    await expect(page).toHaveURL(/agent=/)
    await scrollTo(page, 600)
    await press(page.getByRole('link', { name: 'Open record' }))
    await expect(page).toHaveURL(/\/inventory\/agents\//)
    await page.goBack()
    await expect(page).toHaveURL(/\/inventory\?agent=/)
    await expect.poll(() => scrollY(page)).toBeGreaterThanOrEqual(598)
    expect(await scrollY(page)).toBeLessThanOrEqual(602)
  })

  test('a story step on a new page starts at its top', async ({ page }) => {
    await page.goto(stepHref(story('marcus'), 5))
    await expect.poll(() => scrollY(page)).toBeGreaterThan(0)
    await page.getByRole('complementary', { name: 'Story' }).getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect.poll(() => scrollY(page)).toBe(0)
  })
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('board rows change colour without a transition', async ({ page }) => {
    await page.goto('/operations/divisions/medications')
    const duration = await page.locator('[data-row-id]').first().evaluate((el) => getComputedStyle(el).transitionDuration)
    expect(duration).toBe('0s')
  })

  test('a story step jumps to its target instead of gliding', async ({ page }) => {
    await page.goto(stepHref(story('priya'), 2))
    await expect.poll(() => scrollY(page)).toBeGreaterThan(0)
    const first = await scrollY(page)
    await page.waitForTimeout(400)
    expect(await scrollY(page)).toBe(first)
  })
})
