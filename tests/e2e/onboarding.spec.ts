import { expect, test, type Page } from '@playwright/test'
import { collectErrors } from './console'

async function viewAs(page: Page, name: string) {
  await page.getByRole('button', { name: /^Viewing as/ }).click()
  await page.getByRole('menuitem', { name: new RegExp(name) }).click()
}

test('start from intake (1a, 2a): blocked until all four are named, then AGT-0123 is a draft', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/inventory')
  await viewAs(page, 'Dana')
  await page.goto('/inventory/agents/med-rec/onboarding/intake?scenario=onboarding-intake')
  await expect(page.getByText('Intake approved · not started')).toBeVisible()
  await expect(page.getByText('REQ-0093 · approved 29 Sep')).toBeVisible()
  const start = page.getByRole('button', { name: 'Start onboarding' })
  await expect(start).toHaveAttribute('aria-disabled', 'true')
  await expect(page.getByText('technical owner not set.')).toBeVisible()
  await expect(page.getByText('Marcus would directly supervise 22 agent activities.')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Marcus’s span' })).toContainText('Med Rec Agent · new')

  await page.getByLabel('Technical owner').selectOption('sam')
  await expect(page.getByText('Dana · 4 of 4')).toBeVisible()
  await page.getByRole('button', { name: 'Start onboarding' }).click()
  await expect(page).toHaveURL(/\/inventory\/agents\/med-rec\/onboarding\/job$/)
  await expect(page.getByRole('button', { name: /^1 · Intake Dana · done 01 Oct/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^2 · Job description Marcus · 2 of 7/ })).toBeVisible()
  await expect(page.getByText('AGT-0123 · v0.1 · from REQ-0093')).toBeVisible()
  expect(errors).toEqual([])
})

test('Review focus 4: unknown agents and steps are Not found; later steps wait for the start', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/inventory/agents/nope/onboarding/job')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  await page.goto('/inventory/agents/med-rec/onboarding/nope')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  await page.goto('/inventory/agents/med-rec/onboarding/job?scenario=onboarding-intake')
  await expect(page.getByText('Starts when Dana starts onboarding.')).toBeVisible()
  expect(errors).toEqual([])
})

test('Review focus 5: on 01 Oct the boards hold nothing from December', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/operations/divisions/medications?scenario=onboarding-intake')
  await expect(page.locator('[data-row-id="renal-dosing"]')).toContainText('Within scope')
  await expect(page.locator('[data-row-id="med-rec"]')).toHaveCount(0)
  await expect(page.locator('[data-row-id="controlled-drug"]')).not.toContainText('Paused')
  await expect(page.locator('[data-row-id]')).toHaveCount(19)
  expect(errors).toEqual([])
})

test('job description (1b) from Drafts (1i): Continue lands on the first missing field', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/inventory?tab=drafts&scenario=onboarding-at-5-of-7')
  await expect(page.getByRole('button', { name: 'Waiting on me · 1' })).toBeVisible()
  const row = page.locator('[data-row-id="med-rec"]')
  await expect(row).toContainText('Escalation triggers, inaccuracy target')
  await expect(row).toContainText('Marcus · you')
  await expect(row).toContainText('6 of 13')
  await row.getByRole('link', { name: 'Continue' }).click()
  await expect(page).toHaveURL(/\/inventory\/agents\/med-rec\/onboarding\/job\?field=escalation$/)
  await expect(page.getByText('Welcome back, Marcus')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Escalation trigger' })).toBeFocused()

  await page.getByRole('button', { name: '+ Patient on dialysis' }).click()
  const inaccurate = page.getByRole('textbox', { name: 'Inaccurate lines target, %' })
  await inaccurate.fill('2')
  await inaccurate.blur()
  await expect(page.getByRole('heading', { name: 'Job description · 7 of 7' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^2 · Job description Marcus · done 04 Oct/ })).toBeVisible()
  expect(errors).toEqual([])
})
