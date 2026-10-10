import { expect, test, type Page } from '@playwright/test'
import { collectErrors } from './console'

// The silent voice makes each beat a tenth of its clip; reduced motion makes the cursor jump.
const OPEN = '/?tour=open&tourVoice=silent'
const AT_MED_REC = /\/operations\/agents\/med-rec\?tour=open$/
const CHAPTER_MS = 10_000

const bar = (page: Page) => page.getByRole('complementary', { name: 'Tour' })
const summary = (page: Page) => page.locator('[data-story-target="agent-summary"]')

/** Open the chapter from a link and press Play. */
async function playOpening(page: Page) {
  await page.goto(OPEN)
  await expect(page).toHaveURL(/\/operations\?tour=open$/)
  await bar(page).getByRole('button', { name: 'Play tour' }).click()
}

/**
 * Which screen a line plays over (Ruling 17): the pathname, sampled while the bar's caption is that
 * line. Its clicks come at the end of the line, so the screen holds while the line is spoken.
 */
async function expectLineOver(page: Page, line: string, pathname: string) {
  await expect
    .poll(
      () =>
        page.evaluate((start) => {
          const caption = document.querySelector('[data-tour="bar"] p')?.textContent ?? ''
          return caption.startsWith(start) ? location.pathname : `caption: ${caption}`
        }, line),
      { message: line, timeout: CHAPTER_MS, intervals: [25] },
    )
    .toBe(pathname)
}

/** The opening has clicked its way to the Med Rec Agent and outlined its summary, skipping nothing. */
async function expectAtMedRec(page: Page) {
  await expect(page).toHaveURL(AT_MED_REC, { timeout: CHAPTER_MS })
  await expect(summary(page)).toBeVisible()
  // The outline is the chapter's last action, so by now every action has run or been skipped.
  await expect(summary(page)).toHaveCSS('outline-style', 'solid')
  await expect(bar(page)).toHaveAttribute('data-skipped', '0')
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

test('the opening clicks from the board to the Med Rec Agent and ends there', async ({ page }) => {
  const errors = collectErrors(page)
  await playOpening(page)
  await expectLineOver(page, "You can't watch them all", '/operations')
  await expectLineOver(page, 'In Medications', '/operations/divisions/medications')
  await expectLineOver(page, 'This one drafts', '/operations/agents/med-rec')
  await expectAtMedRec(page)
  await expect(bar(page)).toHaveCount(0, { timeout: CHAPTER_MS })
  await expect(page).toHaveURL(/\/operations\/agents\/med-rec$/)
  expect(errors).toEqual([])
})

test('Resume tour after a take-over closes what the visitor opened (Review focus 3)', async ({
  page,
}) => {
  const errors = collectErrors(page)
  await playOpening(page)
  await expect(page).toHaveURL(AT_MED_REC, { timeout: CHAPTER_MS })
  await page.getByRole('button', { name: 'Controls' }).click()
  await expect(bar(page)).toContainText('Paused. You’re driving.')
  await page.getByRole('menuitem', { name: /Pause this agent…/ }).click()
  await expect(page.getByRole('dialog', { name: 'Pause Med Rec Agent?' })).toBeVisible()
  await bar(page).getByRole('button', { name: 'Resume tour' }).click()
  // Hold the restarted step on its first screen.
  await bar(page).getByRole('button', { name: 'Pause tour' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/\/operations\?tour=open$/)
  expect(errors).toEqual([])
})

test('a saved state with Med Rec retired still tours Med Rec live (Review focus 5)', async ({
  page,
}) => {
  const errors = collectErrors(page)
  await page.goto('/inventory')
  await page.getByRole('button', { name: /^Viewing as/ }).click()
  await page.getByRole('menuitem', { name: /Dana/ }).click()
  await page.goto('/inventory')
  await page.getByRole('table', { name: 'Agents' }).getByText('Med Rec Agent').click()
  await page
    .getByRole('complementary', { name: 'Selected record' })
    .getByRole('button', { name: 'Disable or retire…' })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Disable or retire Med Rec Agent' })
  await dialog.getByRole('radio', { name: /Retire for good/ }).check()
  await dialog.getByRole('textbox', { name: /Type the agent’s name/ }).fill('Med Rec Agent')
  await dialog.getByRole('textbox', { name: /Reason/ }).fill('Replaced by a new build.')
  await dialog.getByRole('button', { name: 'Retire agent' }).click()
  await expect(dialog).toBeHidden()
  await page.goto('/operations/agents/med-rec')
  await expect(page.getByRole('button', { name: 'Controls' })).toHaveCount(0)

  await playOpening(page)
  // Checked in one sample while the opening is still on: once the tour closes it resets the demo,
  // which would bring Controls back for the wrong reason.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const touring =
            document.querySelector('[data-tour="bar"]') !== null &&
            new URLSearchParams(location.search).get('tour') === 'open'
          if (!touring) return 'not in the opening'
          if (location.pathname !== '/operations/agents/med-rec') return location.pathname
          const controls = [...document.querySelectorAll('button')].some(
            (b) => b.textContent?.trim() === 'Controls',
          )
          return controls ? 'Controls' : 'no Controls'
        }),
      { timeout: CHAPTER_MS, intervals: [25] },
    )
    .toBe('Controls')
  await expectAtMedRec(page)
  expect(errors).toEqual([])
})

test('an unknown chapter is stripped from the URL', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/operations?tour=nope')
  await expect(page).toHaveURL(/\/operations$/)
  await expect(bar(page)).toHaveCount(0)
  expect(errors).toEqual([])
})
