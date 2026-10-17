import { expect, test, type Page } from '@playwright/test'
import { collectErrors } from './console'

/** Phase 12: every hand-off reaches an inbox; information goes to the log. */

async function viewAs(page: Page, name: string) {
  await page.getByRole('button', { name: /^Viewing as/ }).click()
  await page.getByRole('menuitem', { name: new RegExp(`^${name}`) }).click()
}

test('H1: Dana starts Med Rec; Marcus finds the job description in his inbox and opens it', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/inventory')
  await viewAs(page, 'Dana')
  await page.goto('/inventory/agents/med-rec/onboarding/intake?scenario=onboarding-intake')
  await page.getByLabel('Technical owner').selectOption('sam')
  await expect(page.getByText('Asks Sam for tools and hard stops once systems are done')).toBeVisible()
  await page.getByRole('button', { name: 'Start onboarding' }).click()
  await expect(page).toHaveURL(/onboarding\/job$/)

  await viewAs(page, 'Marcus')
  await page.goto('/operations/inbox')
  await page.getByRole('link', { name: /Job: description and systems to write/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Med Rec Agent from REQ-0093: write the job description, then systems and verbs' })).toBeVisible()
  await page.getByRole('link', { name: 'Open the job description' }).click()
  await expect(page).toHaveURL(/\/inventory\/agents\/med-rec\/onboarding\/job$/)
  expect(errors).toEqual([])
})

test('H6: Flag for SOP is shared with Sam, and the case page says so', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/operations/agents/med-rec/cases/enc-4105?scenario=shadow-day-21')
  await page.getByRole('button', { name: 'Flag for SOP' }).click()
  await expect(page.getByText('Logged and shared with Sam.')).toBeVisible()
  expect(errors).toEqual([])
})
