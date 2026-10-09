import { expect, test, type Page } from '@playwright/test'
import { collectErrors } from './console'

async function viewAs(page: Page, name: string) {
  await page.getByRole('button', { name: /^Viewing as/ }).click()
  await page.getByRole('menuitem', { name: new RegExp(`^${name}`) }).click()
}

test('10a: Ana flags a draft from Epic in one action; Marcus answers in the inbox; Ana sees it in progress', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/operations')
  await viewAs(page, 'Ana')
  await expect(page).toHaveURL(/\/epic$/)
  await expect(page.getByRole('heading', { name: 'Harper, Lillian' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0)
  await expect(page.getByText('edited by you')).toBeVisible()
  await page.getByRole('button', { name: 'Flag a problem' }).click()
  const form = page.getByRole('region', { name: 'Flag this draft to Marcus' })
  await expect(form.getByRole('button', { name: 'Frequency wrong' })).toHaveAttribute('aria-pressed', 'true')
  await expect(form.getByText('Picked from your edit. Change it if it’s wrong.')).toBeVisible()
  await form.getByRole('button', { name: 'Send flag' }).click()
  await expect(page.getByText('Flag FB-2291 sent to Marcus. You’ll see here when it leads to a fix.')).toBeVisible()
  await expect(page.getByText('Your flags · 3')).toBeVisible()

  await viewAs(page, 'Marcus')
  await page.goto('/operations/inbox')
  await expect(page.getByRole('link', { name: 'Needs me · 5' })).toBeVisible()
  await page.getByText('Flag from Epic').first().click()
  await page.getByRole('button', { name: 'Working on a fix…' }).click()
  await page.getByLabel('What you’re doing about it').fill('Sam is changing how the frequency is read')
  await page.getByRole('button', { name: 'Send', exact: true }).click()

  await viewAs(page, 'Ana')
  await expect(page.getByText('In progress · Marcus').first()).toBeVisible()
  expect(errors).toEqual([])
})

test('the stand-in’s own buttons say they belong to Epic; others see the panel read only', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/epic')
  await page.getByRole('button', { name: 'Verify list' }).click()
  await expect(page.getByText('Stand-in for Epic. Only the panel on the right is part of the prototype.')).toBeVisible()
  await expect(page.getByText('Viewing Ana R.’s Epic stand-in. Only pharmacists flag drafts here.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Flag a problem' })).toHaveAttribute('aria-disabled', 'true')
  await page.getByRole('button', { name: 'View trace' }).click()
  await expect(page.getByRole('list', { name: 'Agent trace' })).toContainText('No dose changed')
  expect(errors).toEqual([])
})

test('10b: nine days later, Ana’s panel tells her the flag led to a fix; Dismiss hides it', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/operations')
  await viewAs(page, 'Ana')
  await page.goto('/epic?day=later')
  await expect(page).toHaveURL(/\/epic$/)
  await expect(page.getByRole('heading', { name: 'Okafor, James' })).toBeVisible()
  const fix = page.getByRole('region', { name: 'Your flag led to a fix' })
  await expect(fix).toContainText('Fixed in v1.5.0, live since 16 Dec. 5 other pharmacists flagged the same thing.')
  await expect(fix).toContainText('Marcus: “Thanks. This caused the edit-rate jump on 7 West.”')
  await fix.getByRole('button', { name: 'What changed' }).click()
  await expect(fix).toContainText('Fixes the frequency split pharmacists have flagged since the Epic upgrade.')
  await fix.getByRole('button', { name: 'Dismiss' }).click()
  await expect(page.getByRole('region', { name: 'Your flag led to a fix' })).toHaveCount(0)
  await expect(page.getByText('Fixed in v1.5.0', { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('/epic?day=nope keeps today', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/epic?day=nope')
  await expect(page).toHaveURL(/\/epic$/)
  await expect(page.getByRole('heading', { name: 'Harper, Lillian' })).toBeVisible()
  expect(errors).toEqual([])
})
