import { expect, test, type Page } from '@playwright/test'
import { collectErrors } from './console'

async function viewAs(page: Page, name: string) {
  await page.getByRole('button', { name: /^Viewing as/ }).click()
  await page.getByRole('menuitem', { name: new RegExp(`^${name}`) }).click()
}

test('division settings (8a): Dana sends lapsed reviews back to Shadow at once; the board follows', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/settings/divisions/medications')
  await viewAs(page, 'Dana')
  await page.goto('/settings/divisions/medications')
  await expect(page.getByRole('heading', { name: 'Medications' })).toBeVisible()
  await expect(page.getByText('Division · 20 agents · 17 activities at Draft')).toBeVisible()
  await expect(page.getByText('With this setting it returns to Shadow on 15 Dec.', { exact: false })).toBeVisible()
  await page.getByRole('radio', { name: /Back to Shadow at once/ }).check()
  await expect(page.getByText('1 change · logged as Dana · Priya told')).toBeVisible()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('No changes')).toBeVisible()
  await page.goto('/operations/divisions/medications')
  await expect(page.locator('[data-row-id="duplicate-rx"]')).toContainText('Shadow')
  expect(errors).toEqual([])
})

test('Jordan reads division settings but cannot save; unknown divisions are Not found', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/settings/divisions/medications')
  await viewAs(page, 'Jordan')
  await page.goto('/settings/divisions/medications')
  await expect(page.getByRole('button', { name: 'Save changes' })).toHaveAttribute('aria-disabled', 'true')
  await expect(page.getByRole('radio')).toHaveCount(0)
  await page.goto('/settings/divisions/nope')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  expect(errors).toEqual([])
})
