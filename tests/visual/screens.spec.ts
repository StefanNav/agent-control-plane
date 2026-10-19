import { expect, test, type Page } from '@playwright/test'
import { routeTable } from '../../src/app/routes'
import { FRAMES } from '../capture/frames'
import { viewAs } from '../capture/persona'
import { skipWelcomeScreen } from '../e2e/welcomed'

/**
 * The screenshot gate (docs/design-system/contributing.md → "Prove it changed nothing else").
 * Every designed frame in the state its frame shows, every route, and the screens that render
 * differently from their route, each compared pixel for pixel with a baseline taken before the change.
 *
 *   pnpm visual:baseline   on main, or before you touch anything: writes the baseline
 *   pnpm visual            after the change: lists every screen it reached
 */

test.beforeEach(async ({ page }) => {
  await skipWelcomeScreen(page)
})

/** Screens that render differently from their route's sample path (as in a11y.spec.ts). */
const VARIANTS = [
  '/operations/agents/med-rec?tab=scorecard',
  '/operations/agents/med-rec?tab=changes',
  '/operations/agents/med-rec?scenario=change-detected-v150&tab=changes',
  '/inventory?tab=drafts',
  '/inventory/agents/med-rec/onboarding/review',
]

async function shoot(page: Page, name: string, act?: (page: Page) => Promise<void>) {
  await page.getByRole('heading', { level: 1 }).first().waitFor()
  // Measure only once fonts have loaded: text set in a fallback font changes the page's height.
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(100)
  // Grow the window to the page instead of a full-page shot, as the capture suite does: a full-page
  // shot resizes the page under the app, which closes open menus and misplaces fixed elements.
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  await page.setViewportSize({ width: 1440, height: Math.max(900, height) })
  if (act) await act(page)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(200)
  await expect(page).toHaveScreenshot(`${name}.png`, { animations: 'disabled', caret: 'hide' })
}

const slug = (path: string) =>
  path.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/-$/, '') || 'landing'

for (const shot of FRAMES) {
  test(`frame ${shot.frame}`, async ({ page }) => {
    if (shot.persona) await viewAs(page, shot.persona)
    await page.goto(shot.url)
    await shoot(page, `frame-${shot.frame}`, shot.act)
  })
}

for (const path of [...routeTable.map((route) => route.samplePath), ...VARIANTS]) {
  test(`route ${path}`, async ({ page }) => {
    await page.goto(path)
    await shoot(page, `route-${slug(path)}`)
  })
}
