import { expect, test, type Page } from '@playwright/test'
import { collectErrors } from './console'

async function viewAs(page: Page, name: string) {
  await page.getByRole('button', { name: /^Viewing as/ }).click()
  await page.getByRole('menuitem', { name: new RegExp(`^${name}`) }).click()
}

test('11a → 11b: Marcus sends a sampling change for 6 North; Priya signs it from her inbox', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/operations/divisions/medications')
  await page.getByRole('navigation', { name: 'Division sections' }).getByRole('link', { name: 'Reviewer behaviour' }).click()
  await expect(page.getByRole('heading', { name: 'Reviewer behaviour' })).toBeVisible()
  await expect(page.getByText('Approvals on 6 North got faster while the independent check found more misses.')).toBeVisible()
  await page.getByRole('link', { name: 'Open 6 North' }).first().click()
  await expect(page).toHaveURL(/\/operations\/reviewers\/6-north$/)
  await expect(page.getByText('Night coverage changed on 15 Nov.')).toBeVisible()
  await page.getByRole('button', { name: 'Send to Priya for sign-off' }).click()
  await expect(page.getByText('Waiting for Priya.')).toBeVisible()

  await viewAs(page, 'Priya')
  await page.goto('/operations/inbox')
  await page.getByText('Review: sampling change · 6 North').first().click()
  await page.getByRole('link', { name: 'Open 6 North' }).click()
  await page.getByRole('button', { name: 'Sign', exact: true }).click()
  await expect(page.getByText('Sampling on 6 North is 20 % until 22 Dec.', { exact: false })).toBeVisible()
  expect(errors).toEqual([])
})

test('the period select narrows 11a; an unknown unit is Not found', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/operations/reviewers')
  await page.getByRole('combobox', { name: 'Period' }).selectOption('4')
  await expect(page.getByText('All agents in Medications · 17 Nov to 08 Dec')).toBeVisible()
  await page.goto('/operations/reviewers/nope')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  expect(errors).toEqual([])
})
