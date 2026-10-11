import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { test } from '@playwright/test'
import type { PersonaId } from '../../src/data/types'
import { viewAs } from './persona'

/**
 * The decision cards' thumbnails (Ruling 30): the screen each decision played out on, at 1440 × 900,
 * the product area only (below the top bars, so no prototype brand shows), as JPEG by R7.
 */

/** Where the thumbnails go, from the repo root whatever the working directory. */
const OUT = path.resolve(import.meta.dirname, '../../public/tour/artifacts')

const SHOTS: { file: string; url: string; persona?: PersonaId; ready: string }[] = [
  {
    file: 'decision-1-sign',
    url: '/inventory/privileges/prv-0142/sign?scenario=awaiting-signature',
    persona: 'priya',
    ready: 'sign-signature',
  },
  {
    file: 'decision-2-division',
    url: '/operations/divisions/medications?scenario=baseline',
    ready: 'division-agents',
  },
  {
    file: 'decision-3-resume',
    url: '/operations/agents/med-rec?scenario=resume-requested',
    persona: 'priya',
    ready: 'resume-reason',
  },
]

for (const shot of SHOTS) {
  test(`decision thumbnail ${shot.file}`, async ({ page }, testInfo) => {
    // No transitions or animations, so the screen is still when it is taken.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    if (shot.persona) await viewAs(page, shot.persona)
    await page.goto(shot.url)
    await page.waitForURL((url) => !url.searchParams.has('scenario'))
    await page.locator(`[data-story-target="${shot.ready}"]`).waitFor()
    await page.evaluate(() => document.fonts.ready)
    const top = await page
      .locator('main')
      .evaluate((el) => Math.round(el.getBoundingClientRect().top))
    const viewport = page.viewportSize()!
    const png = testInfo.outputPath(`${shot.file}.png`)
    await page.screenshot({
      path: png,
      clip: { x: 0, y: top, width: viewport.width, height: viewport.height - top },
    })
    mkdirSync(OUT, { recursive: true })
    execFileSync('ffmpeg', [
      '-y',
      '-loglevel',
      'error',
      '-i',
      png,
      '-vf',
      "scale='min(1600,iw)':-2",
      '-q:v',
      '3',
      '-map_metadata',
      '-1',
      path.join(OUT, `${shot.file}.jpg`),
    ])
  })
}
