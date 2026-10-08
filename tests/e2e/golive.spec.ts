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

async function viewAs(page: import('@playwright/test').Page, name: string) {
  await page.getByRole('button', { name: /^Viewing as/ }).click()
  await page.getByRole('menuitem', { name: new RegExp(name) }).click()
}

test('sign the privilege (3c): below target needs a reason; the signature moves admission med rec to Draft', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/inventory')
  await viewAs(page, 'Priya')
  await page.goto('/inventory/privileges/prv-0142/sign?scenario=awaiting-signature')
  await expect(page.getByRole('heading', { name: 'Move admission med rec to Draft' })).toBeVisible()
  await expect(page.getByText('05 Feb 2027 · in 91 days · a lapse sends the activity back to Shadow')).toBeVisible()
  const sign = page.getByRole('button', { name: 'Sign and move to Draft' })
  await expect(sign).toHaveAttribute('aria-disabled', 'true')
  await page.getByRole('textbox', { name: 'Reason for signing below target' }).fill('21 of the 29 inaccurate lines were brand and generic name mismatches.')
  await page.getByRole('checkbox', { name: /I accept accountability/ }).click()
  await sign.click()
  await expect(page.getByText('Signed by Priya · 06 Nov 2026 09:52.')).toBeVisible()
  await page.goto('/inventory/privileges/nope/sign')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  expect(errors).toEqual([])
})

test('my privileges (3d): the overdue review, renewed in place', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/inventory')
  await viewAs(page, 'Priya')
  await expect(page).toHaveURL(/\/portfolio\/privileges$/)
  await expect(page.getByRole('link', { name: 'All · 17' })).toBeVisible()
  await expect(page.locator('[data-row-id="prv-0098"]')).toContainText('Review overdue · 7 days')
  await page.getByRole('button', { name: 'Review now' }).click()
  await expect(page.getByRole('heading', { name: 'Renew flag duplicate therapy at Draft' })).toBeVisible()
  await page.getByRole('checkbox', { name: /I accept accountability/ }).click()
  await page.getByRole('button', { name: 'Renew for 90 days' }).click()
  await expect(page.getByText(/^Signed by Priya · 08 Dec 2026 09:52\./)).toBeVisible()
  await page.goto('/portfolio/privileges')
  await expect(page.getByRole('link', { name: 'Overdue · 0' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Review now' })).toHaveCount(0)
  expect(errors).toEqual([])
})
