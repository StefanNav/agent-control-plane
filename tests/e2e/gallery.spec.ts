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

test('product components render in light and dark', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/about/components')
  await expect(page.getByRole('heading', { level: 2, name: 'Product components', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Dark', exact: true })).toBeVisible()
  const product = page.locator('section', { has: page.getByRole('heading', { level: 2, name: 'Product components', exact: true }) })
  for (const status of ['normal', 'review', 'warn', 'crit', 'stale', 'shadow', 'paused']) {
    await expect(product.locator(`[data-status="${status}"]`).first()).toBeVisible()
  }
  const dark = page.locator('[data-theme="dark"]', { has: page.locator('[data-status="review"]') })
  const light = await product.locator('[data-status="review"] span').first().evaluate((el) => getComputedStyle(el).color)
  const darkColor = await dark.locator('[data-status="review"] span').first().evaluate((el) => getComputedStyle(el).color)
  expect(darkColor).not.toBe(light)
  expect(errors).toEqual([])
})

test('the pause dialog opens from the gallery', async ({ page }) => {
  await page.goto('/about/components')
  await page.getByRole('button', { name: 'Open pause dialog' }).click()
  await expect(page.getByRole('dialog', { name: 'Pause Med Rec Agent?' })).toBeVisible()
})
