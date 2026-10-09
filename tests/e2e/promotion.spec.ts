import { expect, test, type Page } from '@playwright/test'
import { collectErrors } from './console'

async function viewAs(page: Page, name: string) {
  await page.getByRole('button', { name: /^Viewing as/ }).click()
  await page.getByRole('menuitem', { name: new RegExp(`^${name}`) }).click()
}

const REASON = 'Adding an outside allergy only makes prescribing more cautious. 90 days of evidence, every criterion met, and step-down on any defect.'

test('14a → 14b: Priya signs one branch; Dr. Lee approves it at the board; the branch is Supervised', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/')
  await viewAs(page, 'Priya')
  await page.goto('/portfolio/activities/allergy-recon?tab=privilege')
  await page.getByRole('link', { name: 'Review the promotion' }).click()
  await expect(page).toHaveURL(/\/inventory\/promotions\/prm-0007$/)
  await page.getByRole('textbox', { name: 'Reason' }).fill(REASON)
  await page.getByRole('checkbox', { name: /I accept accountability/ }).check()
  await page.getByRole('button', { name: 'Sign and send to the board' }).click()
  await expect(page.getByText('With the board').first()).toBeVisible()

  await viewAs(page, 'Dr. Lee')
  await page.goto('/operations/inbox')
  await page.getByText('Review: promotion · Allergy Recon Agent').first().click()
  await page.getByRole('link', { name: 'Open the promotion' }).click()
  await expect(page).toHaveURL(/\/portfolio\/promotions\/prm-0007$/)
  await page.getByRole('textbox', { name: 'Reason' }).fill('Good evidence on a branch that only adds caution.')
  await page.getByRole('button', { name: 'Record decision' }).click()
  await expect(page.getByText('Decision logged')).toBeVisible()

  await viewAs(page, 'Priya')
  await page.goto('/portfolio/activities/allergy-recon?tab=privilege')
  await expect(page.locator('[data-row-id="outside-records"]')).toContainText('At Supervised')
  expect(errors).toEqual([])
})

test('an unknown promotion is Not found', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/portfolio/promotions/nope')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  await page.goto('/inventory/promotions/nope')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  expect(errors).toEqual([])
})
