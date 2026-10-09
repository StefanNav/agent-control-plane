import { mkdirSync } from 'node:fs'
import { test, type Page } from '@playwright/test'
import type { PersonaId } from '../../src/data/types'
import { STORIES, stepHref } from '../../src/prototype/stories'
import { viewAs } from './persona'

/** README screenshots (1440 × 900) and the social preview image (1200 × 630), Phase 9 R12. */

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

test('social preview image', async ({ browser }) => {
  // 1440 × 756 at 1200/1440 scale is exactly 1200 × 630, laid out as the designed width.
  const context = await browser.newContext({ viewport: { width: 1440, height: 756 }, deviceScaleFactor: 1200 / 1440 })
  const page = await context.newPage()
  await page.goto('/operations/divisions/medications')
  await settle(page)
  mkdirSync('public', { recursive: true })
  await page.screenshot({ path: 'public/og.png' })
  await context.close()
})
