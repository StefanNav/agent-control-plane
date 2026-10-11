import { expect, test, type Page } from '@playwright/test'
import { collectErrors } from './console'

/** A chapter's section of the case study, by its title. */
const chapter = (page: Page, title: string) =>
  page.getByRole('region', { name: title, exact: true })

test('the page is titled About this work', async ({ page }) => {
  await page.goto('/about')
  await expect(page).toHaveTitle(/^About this work · /)
})

test('Play from here opens the tour on that chapter, paused', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/about?tourVoice=silent')
  await chapter(page, 'Three key decisions').getByRole('link', { name: 'Play from here' }).click()
  await expect(page).toHaveURL(/\/tour\/decisions\?tour=decisions$/)
  const bar = page.getByRole('complementary', { name: 'Tour' })
  await expect(bar.getByRole('button', { name: 'Play tour' })).toBeVisible()
  // A link followed inside the app: no welcome (that is for a link that loads the page).
  await expect(page.locator('[data-tour="welcome"]')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('Open the live screen goes to the matching step of a story', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/about')
  await chapter(page, 'Supervise').getByRole('link', { name: 'Open the live screen' }).click()
  await expect(page).toHaveURL(
    /\/operations\/agents\/med-rec\?control=pause-agent&story=marcus&step=6$/,
  )
  await expect(page.getByRole('complementary', { name: 'Story' })).toContainText('Step 6 of 9')
  expect(errors).toEqual([])
})

test('Open the page shows an interlude as a static page, without the tour', async ({ page }) => {
  await page.goto('/about')
  await chapter(page, 'The problem').getByRole('link', { name: 'Open the page' }).click()
  await expect(page).toHaveURL(/\/tour\/problem$/)
  await expect(page.getByRole('heading', { level: 1, name: 'The problem' })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Tour' })).toHaveCount(0)
})

test('an image opens larger straight away, and Escape closes it', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/about')
  const decisions = chapter(page, 'Three key decisions')
  await decisions
    .getByRole('button', { name: /^The Medications division view in Ledger.*open larger$/ })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Ledger, on a crowded screen' })
  await expect(dialog.getByRole('img')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  expect(errors).toEqual([])
})
