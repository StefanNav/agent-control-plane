import { expect, test } from '@playwright/test'
import { collectErrors } from './console'

test('shadow scorecard (3a) and sample case (3b): Marcus reviews the miss, then asks Priya to sign', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/operations/agents/med-rec?tab=scorecard&scenario=shadow-day-21')
  await expect(page.getByText('Shadow · day 21 of 21')).toBeVisible()
  await expect(page.getByRole('table', { name: 'Criteria' })).toContainText('Below target')
  await expect(page.getByText('Inaccurate lines by cause · 29 lines')).toBeVisible()
  await page.locator('[data-row-id="enc-4105"]').getByRole('link', { name: 'Open' }).click()
  await expect(page).toHaveURL(/\/operations\/agents\/med-rec\/cases\/enc-4105$/)
  await expect(page.getByText('Case 2 of 12', { exact: false })).toBeVisible()
  await expect(page.getByRole('table', { name: 'Agent draft and pharmacist’s final list' })).toContainText('Inaccurate · name')
  await page.getByRole('link', { name: 'Open trace ACT-61840' }).click()
  await expect(page).toHaveURL(/\/operations\/actions\/act-61840$/)

  await page.goto('/operations/agents/med-rec?tab=scorecard')
  await page.getByRole('button', { name: 'Ask Priya to sign' }).click()
  await expect(page.getByText('Requested · waiting for Priya')).toBeVisible()
  expect(errors).toEqual([])
})

test('unknown cases are Not found; at baseline the allergy activity is ready for Draft', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/operations/agents/med-rec/cases/nope')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  await page.goto('/operations/agents/med-rec?tab=scorecard&activity=med-rec-allergy')
  await expect(page.getByText('Shadow · day 54 · 21-day minimum met')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ask Priya to sign' })).not.toHaveAttribute('aria-disabled', 'true')
  expect(errors).toEqual([])
})
