import { expect, test } from '@playwright/test'
import { collectErrors } from './console'

const SECTIONS = ['Tokens', 'Type', 'Icons', 'Buttons', 'Fields', 'Selection', 'Display', 'Table', 'Navigation', 'Menu and modal']

test('gallery shows every primitive section', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/about/components')
  for (const name of SECTIONS) {
    await expect(page.getByRole('heading', { level: 2, name, exact: true })).toBeVisible()
  }
  expect(errors).toEqual([])
})

test('the modal opens and Escape closes it', async ({ page }) => {
  await page.goto('/about/components')
  await page.getByRole('button', { name: 'Open modal' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('the menu opens and shows a locked item', async ({ page }) => {
  await page.goto('/about/components')
  await page.getByRole('button', { name: 'Controls' }).click()
  await expect(page.getByRole('menuitem', { name: /Retire agent/ })).toHaveAttribute('aria-disabled', 'true')
})
