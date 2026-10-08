import { expect, test, type Page } from '@playwright/test'
import { collectErrors } from './console'

async function viewAs(page: Page, name: string) {
  await page.getByRole('button', { name: /^Viewing as/ }).click()
  await page.getByRole('menuitem', { name: new RegExp(`^${name}`) }).click()
}

test('9a: v1.5.0 is held; Marcus replays and signs off, Priya approves HS-04 v3, Marcus accepts', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/operations/agents/med-rec?tab=changes&scenario=change-detected-v150')
  await expect(page.getByText('v1.5.0 held at the gateway')).toBeVisible()
  await expect(page.getByText('v1.3.0 live · AGT-0123')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Changes · 4' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Accept v1.5.0' })).toHaveAttribute('aria-disabled', 'true')
  await page.getByRole('button', { name: 'Start replay' }).click()
  await expect(page.getByRole('list', { name: 'Replay result' })).toContainText('Replayed 2,104 cases on v1.5.0')
  await page.getByRole('button', { name: 'Sign off' }).click()

  await viewAs(page, 'Priya')
  await page.goto('/operations/agents/med-rec?tab=changes')
  await page.getByRole('button', { name: 'Approve', exact: true }).click()
  await expect(page.getByText('Approved · Priya')).toBeVisible()

  await viewAs(page, 'Marcus')
  await page.goto('/operations/agents/med-rec?tab=changes')
  await page.getByRole('button', { name: 'Accept v1.5.0' }).click()
  await expect(page.getByText('v1.5.0 · SOP v1.5 · AGT-0123')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Changes', exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('an agent with no change has no Changes tab; ?tab=changes shows Overview', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/operations/agents/prior-auth?tab=changes')
  await expect(page.getByRole('link', { name: /^Changes/ })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page')
  expect(errors).toEqual([])
})
