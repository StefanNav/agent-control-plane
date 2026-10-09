import { expect, test } from '@playwright/test'
import { routeTable } from '../../src/app/routes'
import { collectErrors } from './console'

for (const route of routeTable) {
  test(`loads ${route.samplePath} directly`, async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto(route.samplePath)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // Phase 7 frame audit: every route due by now is a real screen, not its placeholder.
    if (route.phase <= 7) await expect(page.getByText(/^Built in Phase \d+\.$/)).toHaveCount(0)
    expect(errors).toEqual([])
  })
}

test('unknown paths show Not found inside the app shell', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/no-such-page')
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible()
  expect(errors).toEqual([])
})

test('nav sections without a page redirect to the nearest screen', async ({ page }) => {
  await page.goto('/portfolio')
  await expect(page).toHaveURL(/\/portfolio\/privileges$/)
})

test('the current nav section is marked', async ({ page }) => {
  await page.goto('/operations/agents/med-rec')
  await expect(page.getByRole('link', { name: 'Operations' })).toHaveAttribute('aria-current', 'page')
})
