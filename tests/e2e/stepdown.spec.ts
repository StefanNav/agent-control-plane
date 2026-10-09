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
