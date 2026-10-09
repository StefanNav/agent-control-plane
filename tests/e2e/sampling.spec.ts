import { expect, test, type Page } from '@playwright/test'
import { collectErrors } from './console'

async function viewAs(page: Page, name: string) {
  await page.getByRole('button', { name: /^Viewing as/ }).click()
  await page.getByRole('menuitem', { name: new RegExp(`^${name}`) }).click()
}

test('13b → 13a: Marcus records a defect; the next draw opens; Priya sees Allergy Recon back at Normal', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/operations/divisions/medications')
  await page.getByRole('navigation', { name: 'Division sections' }).getByRole('link', { name: 'Sampling' }).click()
  await expect(page.getByRole('heading', { name: 'Sampling queue' })).toBeVisible()
  await expect(page.getByText('6 drawn · 4 to check')).toBeVisible()
  await page.getByRole('radio', { name: /^Defect/ }).click()
  await page.getByRole('button', { name: 'Record check' }).click()
  await expect(page.getByText('6 drawn · 3 to check')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Encounter 7702 · 7 West · allergy list' })).toBeVisible()

  await viewAs(page, 'Priya')
  await page.goto('/portfolio/activities/allergy-recon')
  await expect(page.getByRole('group', { name: 'Review level' }).locator('[data-current="true"]')).toContainText('Normal')
  expect(errors).toEqual([])
})
