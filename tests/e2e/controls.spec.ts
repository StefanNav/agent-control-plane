import { expect, test } from '@playwright/test'
import { collectErrors } from './console'

test('control menu (6a): scope first, narrow fixes, program lead only', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/operations/agents/med-rec')
  await page.getByRole('button', { name: 'Controls' }).click()
  const menu = page.getByRole('menu')
  await expect(menu).toContainText('Pause every agent in Medications…')
  await expect(menu).toContainText('Back to Draft needs Priya again')
  await expect(menu.getByRole('menuitem', { name: /Retire…/ })).toHaveAttribute('aria-disabled', 'true')
  await menu.getByRole('menuitem', { name: /Pause this agent…/ }).click()
  await expect(page).toHaveURL(/control=pause-agent/)
  expect(errors).toEqual([])
})

test('pause with impact preview (6b): every view agrees the agent is paused', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/operations/agents/med-rec')
  await page.getByRole('button', { name: 'Controls' }).click()
  await page.getByRole('menuitem', { name: /Pause this agent…/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Pause Med Rec Agent?' })
  await expect(dialog).toContainText('drafts in progress go back to pharmacists')
  await dialog.getByRole('textbox', { name: /Reason/ }).fill('HS-04 blocked 3 dose changes since 09:00.')
  await dialog.getByRole('button', { name: 'Pause agent' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText('Paused by Marcus at 09:52.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Controls' })).toHaveCount(0)

  await page.goto('/operations/divisions/medications')
  const row = page.locator('[data-row-id="med-rec"]')
  await expect(row).toContainText('Paused by Marcus')
  await page.goto('/operations')
  await page.getByRole('table', { name: 'Divisions' }).getByText('Medications').click()
  // A paused agent is stopped, not out of scope: Medications drops from 4 to 3 needing a human.
  await expect(page.getByRole('complementary', { name: 'Selected division' })).toContainText('Marcus · 20 agents · 3 need a human')
  expect(errors).toEqual([])
})
