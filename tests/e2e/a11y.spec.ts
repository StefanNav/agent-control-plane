import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { routeTable } from '../../src/app/routes'

/** WCAG 2.1 A and AA plus axe's best practices; any violation fails (Phase 9 R1). */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']

async function violations(page: Page): Promise<string[]> {
  const result = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
}

async function viewAs(page: Page, name: string) {
  await page.getByRole('button', { name: /^Viewing as/ }).click()
  await page.getByRole('menuitem', { name: new RegExp(`^${name}`) }).click()
}

/** Screens that render differently from their route's sample path. */
const VARIANTS = [
  '/operations?view=tiles',
  '/operations?view=exceptions',
  '/operations/inbox?view=digest',
  '/operations/agents/med-rec?tab=scorecard',
  '/operations/agents/med-rec?tab=changes',
  '/operations/agents/med-rec?control=pause-agent',
  '/operations/agents/med-rec?scenario=change-detected-v150&tab=changes',
  ...['intake', 'systems', 'tools', 'approval', 'review'].map((step) => `/inventory/agents/med-rec/onboarding/${step}`),
  '/inventory?tab=drafts',
  '/epic?day=later',
  '/operations/divisions/medications?story=marcus&step=2',
]

const READ_ONLY = [
  '/settings/divisions/medications',
  '/settings/people',
  '/inventory/privileges/prv-0142/sign',
  '/operations/agents/med-rec',
  '/operations/incidents/inc-0029',
]

for (const path of [...routeTable.map((route) => route.samplePath), ...VARIANTS]) {
  test(`axe: ${path}`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    expect(await violations(page)).toEqual([])
  })
}

for (const path of READ_ONLY) {
  test(`axe as Jordan: ${path}`, async ({ page }) => {
    await page.goto('/operations')
    await viewAs(page, 'Jordan')
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    expect(await violations(page)).toEqual([])
  })
}

// The interludes' routes are in the table above, read as static pages. On the tour they show only
// what has been named so far, with the tour bar open.
for (const chapter of ['problem', 'process', 'validate']) {
  test(`axe: the ${chapter} interlude on the tour, part revealed`, async ({ page }) => {
    await page.goto(`/?tour=${chapter}&tourVoice=silent`)
    await expect(page).toHaveURL(new RegExp(`/tour/${chapter}\\?tour=${chapter}$`))
    await expect(page.getByRole('complementary', { name: 'Tour' })).toBeVisible()
    // Part revealed: the first line's item is current, and later ones are there but unseen.
    const main = page.locator('main')
    await expect(main.locator('[data-item][data-state="current"]')).not.toHaveCount(0)
    await expect(main.locator('[aria-current="step"]')).not.toHaveCount(0)
    const hidden = main.locator('[data-item][data-state="hidden"]')
    await expect(hidden).not.toHaveCount(0)
    await expect(hidden.first()).toBeHidden()
    expect(await violations(page)).toEqual([])
  })
}

// The decisions page's first line names nothing on it, so the tour plays to a line that does, then
// holds there: Decision 1 current, the rest there but unseen.
test('axe: the decisions interlude on the tour, part revealed', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?tour=decisions&tourVoice=silent')
  await expect(page).toHaveURL(/\/tour\/decisions\?tour=decisions$/)
  const bar = page.getByRole('complementary', { name: 'Tour' })
  await bar.getByRole('button', { name: 'Play tour' }).click()
  const main = page.locator('main')
  await expect(main.locator('[data-item="d1"][data-state="current"]')).toHaveCount(1)
  await bar.getByRole('button', { name: 'Pause tour' }).click()
  await expect(main.locator('[aria-current="step"]')).not.toHaveCount(0)
  const hidden = main.locator('[data-item][data-state="hidden"]')
  await expect(hidden).not.toHaveCount(0)
  await expect(hidden.last()).toBeHidden()
  expect(await violations(page)).toEqual([])
})

test('axe: the decisions page with an exploration open larger', async ({ page }) => {
  await page.goto('/tour/decisions')
  await page.getByRole('button', { name: /^Ledger’s overview sheet: .*, open larger$/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Ledger' })
  await expect(dialog.getByRole('img')).toBeFocused()
  expect(await violations(page)).toEqual([])
})

test('axe: the agent view with its control menu open', async ({ page }) => {
  await page.goto('/operations/agents/med-rec')
  await page.getByRole('button', { name: 'Controls' }).click()
  await expect(page.getByRole('menu')).toBeVisible()
  expect(await violations(page)).toEqual([])
})

test('axe: the desktop gate', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 })
  await page.goto('/operations')
  await expect(page.getByRole('heading', { level: 1, name: 'Best viewed on a desktop' })).toBeVisible()
  expect(await violations(page)).toEqual([])
})
