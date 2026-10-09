import { expect, test, type Page } from '@playwright/test'
import { collectErrors } from './console'

async function viewAs(page: Page, name: string) {
  await page.getByRole('button', { name: /^Viewing as/ }).click()
  await page.getByRole('menuitem', { name: new RegExp(`^${name}`) }).click()
}

test('12a → 12b: Dana checks coverage, opens Med Rec and exports its packet with the gap listed', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/')
  await viewAs(page, 'Dana')
  await page.goto('/reports/evidence')
  await expect(page.getByRole('heading', { name: 'RUAIH evidence' })).toBeVisible()
  await expect(page.getByText('279 of 287')).toBeVisible()
  await page.getByRole('button', { name: 'Show 3 more' }).click()
  await expect(page.getByText('Vendor BAA not on file for the messaging platform')).toBeVisible()

  await page.locator('[data-row-id="med-rec"]').getByRole('link', { name: 'Med Rec Agent' }).click()
  await expect(page).toHaveURL(/\/reports\/evidence\/med-rec$/)
  await expect(page.getByText('No patient-facing notice yet · Dana · due 19 Dec')).toBeVisible()
  await page.getByRole('button', { name: 'Export packet' }).click()
  const dialog = page.getByRole('dialog', { name: 'Export evidence packet' })
  await expect(dialog.getByText('About 2 min · 214 pages')).toBeVisible()
  await dialog.getByRole('button', { name: 'Export packet' }).click()
  await expect(page.getByText('EXP-0004 · RUAIH evidence packet · 214 pages.', { exact: false })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Exports · 3' })).toBeVisible()
  expect(errors).toEqual([])
})

test('an unknown agent’s packet is Not found', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/reports/evidence/nope')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  expect(errors).toEqual([])
})
