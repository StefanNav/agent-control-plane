import { expect, test, type Page } from '@playwright/test'
import { collectErrors } from './console'

async function viewAs(page: Page, name: string) {
  await page.getByRole('button', { name: /^Viewing as/ }).click()
  await page.getByRole('menuitem', { name: new RegExp(`^${name}`) }).click()
}

test('13a: Priya reads Allergy Recon’s review level and tightens it by hand', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/')
  await viewAs(page, 'Priya')
  await page.goto('/portfolio/activities/allergy-recon')
  await expect(page.getByRole('heading', { name: 'Reconcile allergy lists' })).toBeVisible()
  await expect(page.getByText('Watching')).toBeVisible()
  await expect(page.getByText('84 checks · 0 defects').first()).toBeVisible()
  await page.getByRole('button', { name: 'Tighten now…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Tighten review level' })
  await dialog.getByRole('textbox', { name: 'Reason' }).fill('Two near misses on 8 East this morning')
  await dialog.getByRole('button', { name: 'Tighten' }).click()
  await expect(page.getByRole('group', { name: 'Review level' }).locator('[data-current="true"]')).toContainText('Tightened')
  await expect(page.getByRole('list', { name: 'Level changes' }).getByRole('listitem').first()).toContainText('Reduced → Tightened')
  expect(errors).toEqual([])
})

test('an unknown activity is Not found; one with no rules of its own reads Normal', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/portfolio/activities/nope')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  await page.goto('/portfolio/activities/med-rec-admission?tab=nope')
  await expect(page.getByRole('group', { name: 'Review level' }).locator('[data-current="true"]')).toContainText('Normal')
  expect(errors).toEqual([])
})
