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
