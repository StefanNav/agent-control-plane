import { expect, test, type Page } from '@playwright/test'
import { collectErrors } from './console'

async function viewAs(page: Page, name: string) {
  await page.getByRole('button', { name: /^Viewing as/ }).click()
  await page.getByRole('menuitem', { name: new RegExp(`^${name}`) }).click()
}

test('15a: Med Rec stepped down Draft → Shadow at 06:00; the exception is in Marcus’s inbox; 11a points to it', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/')
  await viewAs(page, 'Marcus')
  await page.goto('/operations/agents/med-rec?scenario=step-down-threshold')
  await expect(page.getByText('Reconcile home medications stepped down from Draft to Shadow at 06:00.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Controls' })).toBeVisible()
  await page.getByRole('link', { name: 'Open the exception' }).click()
  await expect(page).toHaveURL(/\/operations\/inbox\/exc-\d{4}$/)
  await page.goto('/operations/reviewers')
  await expect(page.getByRole('link', { name: '7 West and 8 East: see the step-down' })).toBeVisible()
  expect(errors).toEqual([])
})

test('15b: Priya sees Allergy Recon’s branch back at Draft, re-validating, with restore locked', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/')
  await viewAs(page, 'Priya')
  await page.goto('/portfolio/activities/allergy-recon/branches/outside-records?scenario=step-down-version')
  await expect(page.getByRole('navigation', { name: 'Activity sections' }).getByRole('link', { name: 'History' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByText('1,412 of 2,104 adds replayed')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign to restore Supervised' })).toHaveAttribute('aria-disabled', 'true')
  await page.goto('/portfolio/activities/allergy-recon/branches/nope')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  expect(errors).toEqual([])
})
