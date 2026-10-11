import { mkdirSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import type { PersonaId } from '../../src/data/types'
import { STORIES, stepHref } from '../../src/prototype/stories'
import { viewAs } from './persona'

/** README screenshots (1440 × 900) and the social preview image (1200 × 630), Phase 9 R12; tour.png, Phase 10. */

const marcus = STORIES.find((s) => s.id === 'marcus')!

const SHOTS: { file: string; url: string; persona?: PersonaId }[] = [
  { file: 'landing', url: '/' },
  { file: 'division-board', url: '/operations/divisions/medications' },
  { file: 'agent-view', url: '/operations/agents/med-rec' },
  { file: 'inbox', url: '/operations/inbox/exc-5512' },
  { file: 'sign-privilege', url: '/inventory/privileges/prv-0142/sign?scenario=awaiting-signature', persona: 'priya' },
  { file: 'story', url: stepHref(marcus, 3) },
  { file: 'wall', url: '/wall' },
]

async function settle(page: Page) {
  await page.getByRole('heading', { level: 1 }).first().waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(400)
}

for (const shot of SHOTS) {
  test(`screenshot ${shot.file}`, async ({ page }) => {
    if (shot.persona) await viewAs(page, shot.persona)
    await page.goto(shot.url)
    await settle(page)
    mkdirSync('docs/screenshots', { recursive: true })
    await page.screenshot({ path: `docs/screenshots/${shot.file}.png` })
  })
}

/** The opening's fourth line: the Med Rec Agent's page, its summary outlined. */
const TOUR_LINE = 'This one drafts'

test('screenshot tour', async ({ page }) => {
  // Reduced motion, so the cursor jumps and nothing is caught mid-glide.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?tour=open&tourVoice=silent')
  await expect(page).toHaveURL(/\/operations\?tour=open$/)
  // The silent voice gives each line a tenth of its time, too short to catch from here. So the page
  // presses Pause itself, in the same moment the line comes up. (Paused, the tour hides its cursor.)
  await page.evaluate((line) => {
    new MutationObserver((_, observer) => {
      const caption = document.querySelector('[data-tour="bar"] p')?.textContent ?? ''
      if (!caption.startsWith(line)) return
      observer.disconnect()
      const pause = [...document.querySelectorAll('button')].find(
        (b) => b.textContent === 'Pause tour',
      )
      pause?.click()
    }).observe(document, { subtree: true, childList: true, characterData: true })
  }, TOUR_LINE)
  const bar = page.getByRole('complementary', { name: 'Tour' })
  await bar.getByRole('button', { name: 'Play tour' }).click()
  await expect(bar.locator('p')).toHaveText(new RegExp(`^${TOUR_LINE}`))
  await expect(bar.getByRole('button', { name: 'Play tour' })).toBeVisible()
  await expect(page.locator('[data-story-target="agent-summary"]')).toHaveCSS(
    'outline-style',
    'solid',
  )
  await settle(page)
  mkdirSync('docs/screenshots', { recursive: true })
  await page.screenshot({ path: 'docs/screenshots/tour.png' })
})

test('social preview image', async ({ browser }) => {
  // 1440 × 756 at 1200/1440 scale is exactly 1200 × 630, laid out as the designed width.
  const context = await browser.newContext({
    viewport: { width: 1440, height: 756 },
    deviceScaleFactor: 1200 / 1440,
  })
  const page = await context.newPage()
  await page.goto('/operations/divisions/medications')
  await settle(page)
  mkdirSync('public', { recursive: true })
  await page.screenshot({ path: 'public/og.png' })
  await context.close()
})
