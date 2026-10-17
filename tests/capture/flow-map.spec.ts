import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import type { PersonaId } from '../../src/data/types'
import { viewAs } from './persona'

/**
 * The onboarding-to-go-live flow map: one screen per step, as each person sees it on the day it
 * happens (each URL loads that day's scenario). Product area only, below the prototype bar:
 * `screens/NN-name.png` is the first 1440 px screen, `screens/full/NN-name.png` the whole page.
 * Set FLOW_TEXT_DIR to also save each page's text, for writing the map's descriptions.
 */

const OUT = path.resolve(import.meta.dirname, '../../docs/flow-map/onboarding/screens')

interface Shot {
  file: string
  persona: PersonaId
  url: string
  /** Optional clicks after the page loads, before the capture. */
  act?: (page: Page) => Promise<void>
}

/** Opens an inbox item by its title, as the person would. */
const openItem = (title: RegExp) => async (page: Page) => {
  await page.getByRole('link', { name: title }).first().click()
  await page.waitForTimeout(300)
}

const SHOTS: Shot[] = [
  { file: '01-dana-intake-list', persona: 'dana', url: '/inventory?tab=intake&scenario=onboarding-intake' },
  {
    file: '02-dana-start-onboarding',
    persona: 'dana',
    url: '/inventory/agents/med-rec/onboarding/intake?scenario=onboarding-intake',
    act: async (page) => {
      await page.getByLabel('Technical owner').selectOption('sam')
    },
  },
  { file: '03-marcus-drafts', persona: 'marcus', url: '/inventory?tab=drafts&scenario=onboarding-at-5-of-7' },
  { file: '04-marcus-job-description', persona: 'marcus', url: '/inventory/agents/med-rec/onboarding/job?scenario=onboarding-at-5-of-7' },
  { file: '05-marcus-systems', persona: 'marcus', url: '/inventory/agents/med-rec/onboarding/systems?scenario=onboarding-systems' },
  { file: '06-sam-inbox', persona: 'sam', url: '/operations/inbox?scenario=onboarding-tools-tested', act: openItem(/Tools: hard stops to test/) },
  { file: '07-sam-tools', persona: 'sam', url: '/inventory/agents/med-rec/onboarding/tools?scenario=onboarding-tools-tested' },
  { file: '08-priya-inbox', persona: 'priya', url: '/operations/inbox?scenario=onboarding-sponsor-review', act: openItem(/Review: final set/) },
  { file: '09-priya-approval', persona: 'priya', url: '/inventory/agents/med-rec/onboarding/approval?scenario=onboarding-sponsor-review' },
  {
    file: '10-priya-request-changes',
    persona: 'priya',
    url: '/inventory/agents/med-rec/onboarding/approval?scenario=onboarding-sponsor-review',
    act: async (page) => {
      await page.getByRole('button', { name: /HS-11 v1/ }).click()
      await page.getByRole('button', { name: 'Request changes' }).click()
      await page.getByRole('textbox', { name: 'Note for Sam' }).fill('HS-11 shows 0 blocks. Before I sign, please test it on September’s 8 East transfers.')
    },
  },
  { file: '11-sam-returned', persona: 'sam', url: '/inventory/agents/med-rec/onboarding/tools?scenario=onboarding-returned-hs11' },
  { file: '12-ready-for-review', persona: 'priya', url: '/inventory/agents/med-rec/onboarding/review?scenario=onboarding-ready' },
  { file: '13-dana-inbox', persona: 'dana', url: '/operations/inbox?scenario=onboarding-ready', act: openItem(/Review: risk tier/) },
  { file: '14-dana-risk-tier', persona: 'dana', url: '/inventory/agents/med-rec/risk-tier?scenario=review-risk-tier' },
  { file: '15-drlee-inbox', persona: 'drlee', url: '/operations/inbox?scenario=review-committee', act: openItem(/Review: your decision/) },
  { file: '16-drlee-packet', persona: 'drlee', url: '/portfolio/reviews/med-rec?scenario=review-committee' },
  { file: '17-decision-logged', persona: 'dana', url: '/inventory/agents/med-rec?scenario=review-decided' },
  { file: '18-marcus-scorecard', persona: 'marcus', url: '/operations/agents/med-rec?tab=scorecard&scenario=shadow-day-21' },
  { file: '19-marcus-sample-case', persona: 'marcus', url: '/operations/agents/med-rec/cases/enc-4105?scenario=shadow-day-21' },
  { file: '20-priya-inbox', persona: 'priya', url: '/operations/inbox?scenario=awaiting-signature', act: openItem(/Review: your signature/) },
  { file: '21-priya-sign', persona: 'priya', url: '/inventory/privileges/prv-0142/sign?scenario=awaiting-signature' },
  { file: '22-priya-signed', persona: 'priya', url: '/inventory/privileges/prv-0142/sign?scenario=awaiting-signature', act: (page) => sign(page) },
  {
    file: '23-priya-my-privileges',
    persona: 'priya',
    url: '/inventory/privileges/prv-0142/sign?scenario=awaiting-signature',
    act: async (page) => {
      await sign(page)
      await page.getByRole('link', { name: 'Portfolio' }).click()
      await expect(page).toHaveURL(/\/portfolio\/privileges/)
      await page.getByRole('heading', { level: 1 }).first().waitFor()
    },
  },
]

/** Priya signs below target with the reason the record keeps (3c). */
async function sign(page: Page) {
  await page.getByRole('textbox', { name: 'Reason for signing below target' }).fill('21 of the 29 inaccurate lines were brand and generic name mismatches. SOP v1.3.1 fixes the mapping, and a pharmacist signs every draft (C1).')
  await page.getByRole('checkbox', { name: /I accept accountability/ }).check()
  await page.getByRole('button', { name: 'Sign and move to Draft' }).click()
  await page.waitForTimeout(300)
}

/** The product area: everything below the prototype bar. */
async function productTop(page: Page) {
  return page.getByRole('region', { name: 'Prototype controls' }).evaluate((el) => Math.round(el.getBoundingClientRect().bottom))
}

for (const shot of SHOTS) {
  test(`flow map ${shot.file}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await viewAs(page, shot.persona)
    await page.goto(shot.url)
    await page.waitForURL((url) => !url.searchParams.has('scenario'))
    await page.getByRole('heading', { level: 1 }).first().waitFor()
    if (shot.act) await shot.act(page)
    // Clicks can scroll the page; every screen is shown from its top.
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(300)

    const viewport = page.viewportSize()!
    const top = await productTop(page)
    mkdirSync(path.join(OUT, 'full'), { recursive: true })
    await page.screenshot({ path: path.join(OUT, `${shot.file}.png`), clip: { x: 0, y: top, width: viewport.width, height: viewport.height - top } })

    // The whole page: grow the viewport to the page's height rather than `fullPage` (Phase 9 gotcha).
    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    await page.setViewportSize({ width: viewport.width, height })
    await page.waitForTimeout(200)
    await page.screenshot({ path: path.join(OUT, 'full', `${shot.file}.png`), clip: { x: 0, y: top, width: viewport.width, height: height - top } })

    if (process.env.FLOW_TEXT_DIR) {
      mkdirSync(process.env.FLOW_TEXT_DIR, { recursive: true })
      const text = await page.locator('main').innerText()
      writeFileSync(path.join(process.env.FLOW_TEXT_DIR, `${shot.file}.txt`), `${page.url()}\n\n${text}`)
    }
  })
}
