import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { test } from '@playwright/test'
import type { PersonaId } from '../../src/data/types'
import { viewAs } from './persona'

/**
 * The decision cards' thumbnails (Ruling 30): the screen each decision played out on, at 1440 × 900,
 * the product area only (below the top bars, so no prototype brand shows), as JPEG by R7.
 */

const SHOTS: { file: string; url: string; persona?: PersonaId }[] = [
  {
    file: 'decision-1-sign',
    url: '/inventory/privileges/prv-0142/sign?scenario=awaiting-signature',
    persona: 'priya',
  },
  { file: 'decision-2-division', url: '/operations/divisions/medications?scenario=baseline' },
  {
    file: 'decision-3-resume',
    url: '/operations/agents/med-rec?scenario=resume-requested',
    persona: 'priya',
  },
]

for (const shot of SHOTS) {
  test(`decision thumbnail ${shot.file}`, async ({ page }, testInfo) => {
    if (shot.persona) await viewAs(page, shot.persona)
    await page.goto(shot.url)
    await page.getByRole('heading', { level: 1 }).first().waitFor()
    await page.waitForURL((url) => !url.searchParams.has('scenario'))
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(400)
    const top = await page
      .locator('main')
      .evaluate((el) => Math.round(el.getBoundingClientRect().top))
    const viewport = page.viewportSize()!
    const png = testInfo.outputPath(`${shot.file}.png`)
    await page.screenshot({
      path: png,
      clip: { x: 0, y: top, width: viewport.width, height: viewport.height - top },
    })
    mkdirSync('public/tour/artifacts', { recursive: true })
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
      `public/tour/artifacts/${shot.file}.jpg`,
    ])
  })
}
