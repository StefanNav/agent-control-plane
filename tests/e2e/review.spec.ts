import { expect, test, type Page } from '@playwright/test'
import { collectErrors } from './console'

async function viewAs(page: Page, name: string) {
  await page.getByRole('button', { name: /^Viewing as/ }).click()
  await page.getByRole('menuitem', { name: new RegExp(name) }).click()
}

test('risk tier (2b): Dana raises the suggestion to Tier 3 with a reason and builds the packet', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/inventory')
  await viewAs(page, 'Dana')
  await page.goto('/inventory/agents/med-rec/risk-tier?scenario=review-risk-tier')
  await expect(page.getByText('Suggested · Tier 2', { exact: false })).toBeVisible()
  await expect(page.getByRole('table', { name: 'Risk factors' })).toContainText('About 140 admissions a day on 2 units')
  await page.getByRole('radio', { name: /Tier 3 · High/ }).click()
  const set = page.getByRole('button', { name: 'Set Tier 3 and build the packet' })
  await expect(set).toHaveAttribute('aria-disabled', 'true')
  await page.getByRole('textbox', { name: /Reason for changing the suggested tier/ }).fill('Med rec errors carry into every inpatient order. Pharmacist review catches most, not all.')
  await set.click()
  await expect(page).toHaveURL(/\/portfolio\/reviews\/med-rec$/)
  await page.goto('/inventory/agents/med-rec/risk-tier')
  await expect(page.getByRole('button', { name: /^2 · Risk tier Dana · 13 Oct/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^3 · Committee packet Dana · 13 Oct/ })).toBeVisible()
  expect(errors).toEqual([])
})

test('the record of an agent without AIMS Review records is composed; unknown agents are Not found', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/inventory/agents/claim-scrubber')
  await expect(page.getByRole('heading', { name: 'Claim Scrubber Agent' })).toBeVisible()
  await expect(page.getByText('AIMS inventory')).toBeVisible()
  await page.goto('/inventory/agents/nope')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  expect(errors).toEqual([])
})
