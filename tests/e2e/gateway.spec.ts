import { expect, test, type Page } from '@playwright/test'
import { collectErrors } from './console'

async function viewAs(page: Page, name: string) {
  await page.getByRole('button', { name: /^Viewing as/ }).click()
  await page.getByRole('menuitem', { name: new RegExp(`^${name}`) }).click()
}

test('9b: Dana finds the bot at the gateway and starts onboarding from REQ-0081', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/inventory')
  await viewAs(page, 'Dana')
  await page.goto('/inventory')
  await page.getByRole('link', { name: 'Seen at the gateway · 3' }).click()
  await expect(page.getByRole('heading', { name: 'Seen at the gateway, not registered' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Unregistered · 3' })).toBeVisible()
  const panel = page.getByRole('complementary', { name: 'svc-dc-summary-bot' })
  await expect(panel).toContainText('Seen for 16 days · last call 2 min ago')
  await expect(panel).toContainText('Discharge Huddle Summary Agent · REQ-0081, intake approved 06 Nov, never onboarded')
  await panel.getByRole('link', { name: 'Start onboarding from REQ-0081' }).click()
  await expect(page).toHaveURL(/\/inventory\/agents\/discharge-huddle\/onboarding\/intake$/)
  await expect(page.getByText('Discharge Huddle Summary Agent').first()).toBeVisible()
  expect(errors).toEqual([])
})

test('blocking needs a reason; the caller stays listed as blocked; unknown callers are Not found', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/inventory')
  await viewAs(page, 'Dana')
  await page.goto('/inventory/unregistered/rx-price-check')
  await page.getByRole('button', { name: 'Block at the gateway' }).click()
  const dialog = page.getByRole('dialog', { name: 'Block rx-price-check at the gateway?' })
  await dialog.getByRole('button', { name: 'Block at the gateway' }).click()
  await expect(dialog.getByRole('alert')).toHaveText('Give a reason. Every choice is logged with a reason.')
  await dialog.getByRole('textbox').fill('Reads the worklist with no owner on record')
  await dialog.getByRole('button', { name: 'Block at the gateway' }).click()
  await expect(page.locator('[data-row-id="rx-price-check"]')).toContainText('Blocked')
  await page.goto('/inventory/unregistered/nope')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  expect(errors).toEqual([])
})
