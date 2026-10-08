import { expect, test } from '@playwright/test'
import { collectErrors } from './console'

test('find the one problem among 20 (Marcus): board → division → agent → inbox → dismiss', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/operations')
  await page.getByRole('table', { name: 'Divisions' }).getByText('Medications').click()
  const panel = page.getByRole('complementary', { name: 'Selected division' })
  await expect(panel).toContainText('Marcus · 20 agents · 4 need a human')
  await panel.getByRole('link', { name: 'Open division' }).click()

  const rows = page.locator('[data-row-id]')
  await expect(rows.first()).toContainText('Med Rec Agent')
  await expect(rows.first()).toContainText('Review: 3 drafts')
  await page.getByRole('complementary', { name: 'Selected agent' }).getByRole('link', { name: 'Med Rec Agent' }).click()
  await expect(page).toHaveURL(/\/operations\/agents\/med-rec/)
  await expect(page.getByText('3 drafts held by HS-04 v2 need a pharmacist decision.')).toBeVisible()

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Operations' }).click()
  await page.getByRole('navigation', { name: 'Operations' }).getByRole('link', { name: 'Inbox · 4' }).click()
  await page.getByRole('link', { name: /Edit rate rising/ }).click()
  await page.getByRole('button', { name: 'Dismiss…' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: 'Reason' }).fill('Formulary update F-112 explains the edits.')
  await dialog.getByRole('button', { name: 'Dismiss with reason' }).click()
  await expect(page.getByRole('navigation', { name: 'Inbox' }).getByRole('link', { name: 'Needs me · 3' })).toBeVisible()

  // Dismissing closes the exception; the agent's judgment (edit rate still 19.2 %) is unchanged,
  // so Medications still has 4 agents needing a human. This is the designed behaviour.
  await page.goto('/operations')
  await page.getByRole('table', { name: 'Divisions' }).getByText('Medications').click()
  await expect(page.getByRole('complementary', { name: 'Selected division' })).toContainText('4 need a human')
  expect(errors).toEqual([])
})
