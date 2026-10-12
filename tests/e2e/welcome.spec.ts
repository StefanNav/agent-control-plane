import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { collectErrors } from './console'

/** A tour link, as shared: it opens the first chapter paused, on the tour's welcome card. */
const LINK = '/?tour=open&tourVoice=silent'

const splash = (page: Page) => page.locator('[data-tour="splash"]')
const card = (page: Page) => page.locator('[data-tour="welcome"]')
const play = (page: Page) =>
  page.locator('[data-tour="bar"]').getByRole('button', { name: 'Play tour' })

test.describe('Attune’s full-page welcome before a tour link’s first screen', () => {
  test('a fresh visit: the mark dances over its name, then the page opens on the welcome card', async ({
    page,
  }) => {
    const errors = collectErrors(page)
    await page.goto(LINK)
    await expect(splash(page)).toBeVisible()
    await expect(splash(page)).toHaveAttribute('aria-hidden', 'true')
    await expect(splash(page).locator('[data-attune="welcome"]')).toHaveAttribute(
      'data-state',
      'dancing',
    )
    await expect(splash(page)).toContainText('Attune')
    // The dance (about 2.8 s of frames), a beat, the fade: generous for a slow machine.
    await expect(splash(page)).toHaveCount(0, { timeout: 8000 })
    await expect(card(page)).toBeVisible()
    await expect(play(page)).toBeFocused()
    expect(errors).toEqual([])
  })

  test('a key skips it and presses nothing beneath: the tour waits on its card', async ({
    page,
  }) => {
    await page.goto(LINK)
    await expect(splash(page)).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(splash(page)).toHaveCount(0, { timeout: 1500 })
    await expect(card(page)).toBeVisible()
    await expect(play(page)).toBeVisible()
  })

  test('a click skips it, and the card stays', async ({ page }) => {
    await page.goto(LINK)
    await expect(splash(page)).toBeVisible()
    await splash(page).click({ position: { x: 24, y: 24 } })
    await expect(splash(page)).toHaveCount(0, { timeout: 1500 })
    await expect(card(page)).toBeVisible()
    await expect(play(page)).toBeVisible()
  })

  test('a refresh plays it again', async ({ page }) => {
    await page.goto(LINK)
    await expect(splash(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(splash(page)).toHaveCount(0, { timeout: 1500 })
    await page.reload()
    await expect(splash(page)).toBeVisible()
    await expect(splash(page)).toHaveCount(0, { timeout: 8000 })
    await expect(card(page)).toBeVisible()
  })

  test('under reduced motion it never shows', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(LINK)
    await expect(card(page)).toBeVisible()
    await expect(splash(page)).toHaveCount(0)
  })

  test('the landing page’s Play the tour starts at once, with no welcome screen', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /^Play the tour/ }).click()
    await expect(page.locator('[data-tour="bar"]')).toBeVisible()
    await expect(splash(page)).toHaveCount(0)
  })

  test('axe finds nothing to flag while it covers the page', async ({ page }) => {
    await page.goto(LINK)
    await expect(splash(page)).toBeVisible()
    // Once the card beneath and the name have faded in (about 1 s), with the mark still dancing.
    await page.evaluate(() =>
      Promise.all(document.getAnimations().map((animation) => animation.finished)),
    )
    await expect(splash(page)).toBeVisible()
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze()
    expect(result.violations.map((v) => v.id)).toEqual([])
  })
})
