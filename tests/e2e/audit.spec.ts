import { expect, test } from '@playwright/test'
import { collectErrors } from './console'

const asJordan = async (page: import('@playwright/test').Page) => {
  await page.goto('/operations/actions')
  await page.getByRole('button', { name: /^Viewing as/ }).click()
  await page.getByRole('menuitem', { name: /Jordan/ }).click()
}

test('action list (7a) and trace (7b), read only, as Jordan', async ({ page }) => {
  const errors = collectErrors(page)
  await asJordan(page)
  await page.goto('/operations/actions?agent=med-rec&policy=blocked')
  await expect(page.getByText('3 of 1,912 actions today')).toBeVisible()
  await expect(page.getByText('Read only · risk manager')).toBeVisible()
  const rows = page.getByRole('table', { name: 'Actions' }).locator('[data-row-id]')
  await expect(rows).toHaveCount(3)
  await rows.first().getByRole('link', { name: 'ACT-88213' }).click()
  await expect(page).toHaveURL(/\/operations\/actions\/act-88213/)
  await expect(page.getByRole('heading', { name: 'Draft med list · encounter 4417' })).toBeVisible()
  await expect(page.getByText('Policy · blocked')).toBeVisible()
  await expect(page.getByText('4 checked · 1 blocked')).toBeVisible()
  expect(errors).toEqual([])
})

test('Open incident from the trace creates INC-0031 and opens its record', async ({ page }) => {
  await asJordan(page)
  await page.goto('/operations/actions/act-88213')
  await page.getByRole('button', { name: 'Open incident' }).click()
  const dialog = page.getByRole('dialog', { name: 'Open an incident' })
  await expect(dialog).toContainText('Links 3 actions blocked by HS-04 v2 today')
  await dialog.getByRole('button', { name: 'Open incident' }).click()
  await expect(page).toHaveURL(/\/operations\/incidents\/inc-0031/)
})

test('Review focus 5: an unknown action is not found; a trace-less action says so', async ({ page }) => {
  await page.goto('/operations/actions/nope')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  await page.goto('/operations/actions/act-88240')
  await expect(page.getByText('No step-level trace was kept for this action.')).toBeVisible()
})

test('incident record (7c) in resume-requested: people, root cause, corrections, Close locked', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/operations/incidents/inc-0031?scenario=resume-requested')
  await expect(page.getByRole('heading', { name: 'Dose changes proposed on admission drafts' })).toBeVisible()
  await expect(page.getByText('Root cause · Sam')).toBeVisible()
  await expect(page.getByRole('table', { name: 'Corrections' }).getByRole('row')).toHaveCount(4)
  await expect(page.getByRole('button', { name: 'Close incident' })).toHaveAttribute('aria-disabled', 'true')
  await page.goto('/operations/incidents/nope')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  await page.goto('/operations/incidents')
  await page.getByRole('link', { name: 'INC-0029' }).click()
  await expect(page.getByRole('heading', { name: 'Appeal drafted for the wrong encounter' })).toBeVisible()
  expect(errors).toEqual([])
})

test('export for a surveyor (7d): built from the record and logged', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/reports/export?agent=med-rec')
  await expect(page.getByRole('heading', { name: 'Export records' })).toBeVisible()
  await expect(page.getByText('PRV-0142 v1 to v3 · 2 signatures')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Past exports · 3' })).toBeVisible()
  await page.getByRole('button', { name: 'Build export' }).click()
  await expect(page.getByText(/EXP-0004 built/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Past exports · 4' })).toBeVisible()
  expect(errors).toEqual([])
})

test('Important #6: Marcus can’t export another division’s agent; the button says why', async ({ page }) => {
  await page.goto('/reports/export?agent=prior-auth')
  const build = page.getByRole('button', { name: 'Build export' })
  await expect(build).toHaveAttribute('aria-disabled', 'true')
  await expect(build).toHaveAccessibleDescription(/.+/)
})
