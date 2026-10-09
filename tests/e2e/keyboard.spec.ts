import { expect, test, type Page } from '@playwright/test'
import { personaById } from '../../src/prototype/personas'
import { STORIES, stepHref } from '../../src/prototype/stories'
import { collectErrors } from './console'

const marcus = STORIES.find((story) => story.id === 'marcus')!
const panel = (page: Page) => page.getByRole('complementary', { name: 'Story' })
const focusedInside = (page: Page, selector: string) =>
  page.evaluate((s) => Boolean(document.activeElement?.closest(s)), selector)

/** Presses Tab until `done` holds, at most `max` times; returns whether it did. */
async function tabUntil(page: Page, done: () => Promise<boolean>, max = 60) {
  for (let i = 0; i < max; i++) {
    if (await done()) return true
    await page.keyboard.press('Tab')
  }
  return done()
}

test('the first Tab offers a skip link that lands in the page (R2)', async ({ page }) => {
  await page.goto('/operations')
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Skip to content' })
  await expect(skip).toBeFocused()
  await expect(skip).toBeInViewport()
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()
  await page.keyboard.press('Tab')
  expect(await focusedInside(page, 'main')).toBe(true)
})

test('the wall has no skip link', async ({ page }) => {
  await page.goto('/wall')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toHaveCount(0)
})

test('every page names itself in the browser tab (R3)', async ({ page }) => {
  await page.goto('/operations/divisions/medications')
  await expect(page).toHaveTitle('Division view · Signal Agent Control Plane')
  await page.goto('/')
  await expect(page).toHaveTitle('Signal · Agent Control Plane')
  await page.goto('/no-such-page')
  await expect(page).toHaveTitle('Page not found · Signal Agent Control Plane')
})

test('the division board follows the keyboard, and opening an agent lands on its page (R4, R7)', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/operations/divisions/medications')
  const rows = page.locator('[data-row-id]')
  expect(await tabUntil(page, () => focusedInside(page, '[data-row-id]'))).toBe(true)
  await expect(rows.first()).toBeFocused()
  await expect(rows.first()).toHaveAttribute('aria-selected', 'true')
  const firstName = (await rows.first().getByRole('cell').nth(1).innerText()).split('\n')[0]!.trim()
  await expect(page.getByRole('complementary', { name: 'Selected agent' })).toContainText(firstName)

  await page.keyboard.press('ArrowDown')
  const second = rows.nth(1)
  await expect(second).toBeFocused()
  await expect(second).toHaveAttribute('aria-selected', 'true')
  const secondId = await second.getAttribute('data-row-id')
  await expect(page).toHaveURL(new RegExp(`agent=${secondId}`))

  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(new RegExp(`/operations/agents/${secondId}$`))
  await expect(page.locator('main h1')).toBeFocused()
  await page.keyboard.press('Tab')
  expect(await focusedInside(page, 'main')).toBe(true)
  expect(errors).toEqual([])
})

test('a dialog opened from the keyboard keeps focus, and gives it back (R4)', async ({ page }) => {
  await page.goto('/operations/agents/med-rec')
  const controls = page.getByRole('button', { name: 'Controls' })
  await controls.focus()
  await page.keyboard.press('Enter')
  await page.getByRole('menuitem', { name: /Pause this agent…/ }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Pause Med Rec Agent?' })).toBeVisible()
  expect(await focusedInside(page, '[role="dialog"]')).toBe(true)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(controls).toBeFocused()
})

test('in a story step that opens a dialog, Tab reaches the panel and Next works (Review focus 2)', async ({ page }) => {
  await page.goto(stepHref(marcus, 6))
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(await focusedInside(page, '[role="dialog"]')).toBe(true)
  expect(await tabUntil(page, () => focusedInside(page, 'aside[aria-label="Story"]'), 20)).toBe(true)
  await expect(panel(page).getByRole('button', { name: 'Hide' })).toBeFocused()
  const next = panel(page).getByRole('button', { name: 'Next' })
  expect(await tabUntil(page, async () => next.evaluate((el) => el === document.activeElement), 10)).toBe(true)
  await page.keyboard.press('Enter')
  await expect(panel(page)).toContainText('Step 7 of 9')

  await page.goto(stepHref(marcus, 6))
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(panel(page)).toContainText('Step 6 of 9')
})

test('starting a story by keyboard puts focus on its first step (R6)', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Follow Marcus’s story →' }).focus()
  await page.keyboard.press('Enter')
  await expect(panel(page).getByRole('heading', { level: 2 })).toBeFocused()
  await expect(page.getByRole('status').filter({ hasText: /^Step 1 of 9: / })).toHaveCount(1)
})

test('the landing page reads in order: Explore freely, then the seven stories', async ({ page }) => {
  await page.goto('/')
  const names: string[] = []
  for (let i = 0; i < 40 && names.length < 1 + STORIES.length; i++) {
    await page.keyboard.press('Tab')
    const name = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.innerText.trim() ?? '')
    if (name === 'Explore freely' || /^Follow .+ story →$/.test(name)) names.push(name)
  }
  expect(names).toEqual([
    'Explore freely',
    ...STORIES.map((story) => `Follow ${personaById(story.personaId).name}’s story →`),
  ])
})

test('the E shortcut works on the board, not from the bar, a menu or a field (R9, Review focus 4)', async ({ page }) => {
  await page.goto('/operations/divisions/medications')
  const url = page.url()
  const persona = page.getByRole('button', { name: /^Viewing as/ })
  await persona.focus()
  await page.keyboard.press('e')
  await expect(page).toHaveURL(url)

  await page.keyboard.press('Enter')
  await expect(page.getByRole('menu')).toBeVisible()
  await page.keyboard.press('e')
  await expect(page).toHaveURL(url)
  await page.keyboard.press('Escape')

  await page.locator('[data-row-id]').first().focus()
  await page.keyboard.press('e')
  await expect(page).toHaveURL(/\/operations\/inbox$/)
})
