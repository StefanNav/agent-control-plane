import { expect, test, type Page } from '@playwright/test'

async function viewAs(page: Page, name: string) {
  await page.getByRole('button', { name: /^Viewing as/ }).click()
  await page.getByRole('menuitem', { name: new RegExp(`^${name}`) }).click()
}

test('switching persona lands on their screen and changes the avatar', async ({ page }) => {
  await page.goto('/operations')
  await expect(page.getByRole('button', { name: /Viewing as Marcus/ })).toBeVisible()
  await viewAs(page, 'Jordan')
  await expect(page).toHaveURL(/\/operations\/actions$/)
  await expect(page.getByRole('button', { name: /Viewing as Jordan/ })).toBeVisible()
  await expect(page.getByRole('banner').getByText('J', { exact: true })).toBeVisible()
})

test('the persona survives a reload, and Reset demo restores Marcus', async ({ page }) => {
  await page.goto('/operations')
  await viewAs(page, 'Priya')
  await page.reload()
  await expect(page.getByRole('button', { name: /Viewing as Priya/ })).toBeVisible()
  await page.getByRole('button', { name: 'Reset demo' }).click()
  await expect(page.getByRole('button', { name: /Viewing as Marcus/ })).toBeVisible()
  await expect(page).toHaveURL(/\/operations\/divisions\/medications$/)
})

test('Ana works in Epic, not the console', async ({ page }) => {
  await page.goto('/operations')
  await viewAs(page, 'Ana')
  await expect(page).toHaveURL(/\/epic$/)
})

test('the persona menu is legible on top of the dark bar', async ({ page }) => {
  await page.goto('/operations')
  await page.getByRole('button', { name: /^Viewing as/ }).click()
  const item = page.getByRole('menuitem', { name: /^Priya/ })
  const { color, ink, focus } = await item.evaluate((el) => {
    const probe = document.createElement('span')
    probe.style.color = 'var(--cs-ink)'
    document.body.appendChild(probe)
    const ink = getComputedStyle(probe).color
    probe.remove()
    const ring = document.createElement('span')
    ring.style.color = 'var(--cs-focus)'
    el.appendChild(ring)
    const focus = getComputedStyle(ring).color
    ring.remove()
    return { color: getComputedStyle(el).color, ink, focus }
  })
  expect(color).toBe(ink)
  expect(focus).toBe(ink)
})
