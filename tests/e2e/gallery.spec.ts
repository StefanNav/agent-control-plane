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

test('in dark mode the hard-stop lock stays visible on its ink bar (Phase 2 deferred)', async ({ page }) => {
  await page.goto('/about/components')
  const dark = page.locator('[data-theme="dark"]').filter({ has: page.getByText('Hard stop · enforced at the gateway') }).first()
  const label = dark.getByText('Hard stop · enforced at the gateway').first()
  const text = await label.evaluate((el) => getComputedStyle(el).color)
  const lock = await label.locator('svg path, svg rect').first().evaluate((el) => {
    const c = el.getAttribute('stroke') ?? el.getAttribute('fill') ?? ''
    const probe = document.createElement('span')
    probe.style.color = c
    el.closest('[data-theme]')!.appendChild(probe)
    const resolved = getComputedStyle(probe).color
    probe.remove()
    return resolved
  })
  expect(lock).toBe(text)
})
