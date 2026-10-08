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

test('committee packet (2c) → decision logged (2d): Dr. Lee approves with conditions', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/inventory')
  await viewAs(page, 'Dr. Lee')
  await page.goto('/portfolio/reviews/med-rec?scenario=review-committee')
  await expect(page.getByText('Review: your decision')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Review packet' })).toContainText('Re-tested on 212 transfers to 8 East, as Priya asked')
  await expect(page.getByRole('radio', { name: /Approve with conditions/ })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('textbox', { name: 'Reason' }).fill('Clear limits and good hard-stop evidence.')
  await page.getByRole('button', { name: 'Record decision' }).click()
  await expect(page).toHaveURL(/\/inventory\/agents\/med-rec$/)
  await expect(page.getByText('Approved with conditions').first()).toBeVisible()
  await expect(page.getByRole('table', { name: 'Privileges' })).toContainText('Shadow from 15 Oct')
  await expect(page.getByText('Next: shadow starts 15 Oct on 7 West and 8 East. Marcus sees the scorecard from day one.')).toBeVisible()
  expect(errors).toEqual([])
})

test('the packet: Not found for unknown ids; decided and read only at baseline', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/portfolio/reviews/nope')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  await page.goto('/portfolio/reviews/med-rec')
  await expect(page.getByRole('heading', { name: 'Approved with conditions' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Record decision' })).toHaveCount(0)
  expect(errors).toEqual([])
})
