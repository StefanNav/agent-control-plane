import { expect, test } from '@playwright/test'

test('a keyboard-focused field shows one ring, on its box', async ({ page }) => {
  await page.goto('/about/components')
  const input = page.locator('#g-purpose')
  await input.focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  await expect(input).toBeFocused()
  const inner = await input.evaluate((el) => getComputedStyle(el).outlineStyle)
  const box = await input.evaluate((el) => getComputedStyle(el.parentElement!).outlineStyle)
  expect(inner).toBe('none')
  expect(box).toBe('solid')
})

test('the focus ring is visible on the dark prototype bar', async ({ page }) => {
  await page.goto('/operations')
  // The skip link comes first (Phase 9 R2); the bar's link is the second stop.
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  const link = page.getByRole('link', { name: /Signal · Agent Control Plane/ })
  await expect(link).toBeFocused()
  const { outline, background } = await link.evaluate((el) => ({
    outline: getComputedStyle(el).outlineColor,
    background: getComputedStyle(el.closest('[role="region"]')!).backgroundColor,
  }))
  expect(outline).not.toBe(background)
})
