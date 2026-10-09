import { mkdirSync } from 'node:fs'
import { test } from '@playwright/test'
import { FRAMES } from './frames'
import { viewAs } from './persona'

/** Visual QA pairs (Phase 9 R11): the frame on the left, the app on the right, 720 px each. Run with QA=1. */
const OUT = '.superpowers/qa'

test.skip(!process.env.QA, 'set QA=1 to write the visual QA pairs')

for (const shot of FRAMES) {
  test(`pair ${shot.frame}`, async ({ page, browser }) => {
    if (shot.persona) await viewAs(page, shot.persona)
    await page.goto(shot.url)
    await page.getByRole('heading', { level: 1 }).first().waitFor()
    // Grow the window to the page instead of a full-page shot: that one resizes the page under the
    // app, which closes open menus and draws fixed elements (skip link, dialogs) in the wrong place.
    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    await page.setViewportSize({ width: 1440, height: Math.max(900, height) })
    if (shot.act) await shot.act(page)
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(300)
    const app = await page.screenshot()

    const design = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
    await design.goto(`http://localhost:4599/${encodeURIComponent(shot.file)}`)
    await design.evaluate(() => document.fonts.ready)
    const board = design.locator(`[id="${shot.frame}"] > :last-child`)
    await board.waitFor()
    await design.waitForTimeout(500)
    const frame = await board.screenshot()
    await design.close()

    const pair = await browser.newPage({ viewport: { width: 1480, height: 900 } })
    const img = (png: Buffer) => `data:image/png;base64,${png.toString('base64')}`
    await pair.setContent(`<!doctype html><body style="margin:0;display:flex;gap:40px;align-items:flex-start;background:#888">
      <img src="${img(frame)}" style="width:720px;display:block">
      <img src="${img(app)}" style="width:720px;display:block"></body>`)
    await pair.evaluate(() => Promise.all([...document.images].map((i) => i.decode())))
    mkdirSync(OUT, { recursive: true })
    await pair.screenshot({ path: `${OUT}/${shot.frame}.png`, fullPage: true })
    await pair.close()
  })
}
