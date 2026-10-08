import { expect, test } from '@playwright/test'
import { collectErrors } from './console'

test.describe('inbox (5a)', () => {
  test('Marcus needs to act on four items, Monitor stale first', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('/operations/inbox')
    await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Inbox' }).getByRole('link', { name: 'Needs me · 4' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Inbox' }).getByRole('link', { name: 'Waiting on others · 2' })).toBeVisible()
    const items = page.getByRole('list', { name: 'Needs me' }).getByRole('listitem')
    await expect(items).toHaveCount(4)
    await expect(items.first()).toContainText('Monitor stale')
    await expect(items.first()).toContainText('Due 10:46')
    await expect(page.getByText('How this reaches you')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('selecting Edit rate rising shows its detail, trend and breakdown', async ({ page }) => {
    await page.goto('/operations/inbox')
    await page.getByRole('link', { name: /Edit rate rising/ }).click()
    await expect(page).toHaveURL(/\/operations\/inbox\/exc-5512/)
    const detail = page.getByRole('region', { name: 'Exception detail' })
    await expect(detail.getByRole('heading', { name: 'Renal Dosing Agent edit rate is 19.2 %' })).toBeVisible()
    await expect(detail).toContainText('EXC-5512 · MR-12 v1 · raised 07:15')
    await expect(detail.getByRole('img', { name: /Edit rate · 14 days/ })).toBeVisible()
    await expect(detail.getByRole('row', { name: /Dose lowered for eGFR 30 to 44/ })).toContainText('23')
    await expect(detail).toContainText('Not handled by 15:00 → goes to Priya')
  })

  test('Snooze → 1 hour removes the item from Needs me', async ({ page }) => {
    await page.goto('/operations/inbox/exc-5512')
    await page.getByRole('button', { name: 'Snooze' }).click()
    await page.getByRole('menuitem', { name: /1 hour/ }).click()
    await expect(page.getByRole('navigation', { name: 'Inbox' }).getByRole('link', { name: 'Needs me · 3' })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Needs me' })).not.toContainText('Edit rate rising')
  })

  test('Investigate goes to the agent view', async ({ page }) => {
    await page.goto('/operations/inbox/exc-5512')
    await page.getByRole('link', { name: 'Investigate', exact: true }).click()
    await expect(page).toHaveURL(/\/operations\/agents\/renal-dosing/)
  })
})

test('dismiss with a reason (5b): blocked until a reason is given, then logged on the agent', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/operations/inbox/exc-5512')
  await page.getByRole('button', { name: 'Dismiss…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Dismiss “Edit rate rising”?' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Logged as Marcus · EXC-5512')
  const confirm = dialog.getByRole('button', { name: 'Dismiss with reason' })
  await expect(confirm).toHaveAttribute('aria-disabled', 'true')
  await confirm.click({ force: true })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('textbox', { name: 'Reason' }).fill('Formulary update F-112 explains the edits.')
  await confirm.click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('navigation', { name: 'Inbox' }).getByRole('link', { name: 'Needs me · 3' })).toBeVisible()
  await page.goto('/operations/agents/renal-dosing?tab=history')
  await expect(page.getByText('Dismissed EXC-5512')).toBeVisible()
  expect(errors).toEqual([])
})

test.describe('digest, log and waiting (5c)', () => {
  test('the daily digest reads like the 07:00 email; Open the log goes to the log', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('/operations/inbox')
    await page.getByRole('link', { name: 'Daily digest' }).click()
    await expect(page.getByText('2 things need you today')).toBeVisible()
    await expect(page.getByText('Changed yesterday · 2')).toBeVisible()
    await page.getByRole('link', { name: 'Open the log' }).click()
    await expect(page).toHaveURL(/tab=log/)
    await expect(page.getByText('41 events')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('Waiting on others lists the two items Marcus is copied on', async ({ page }) => {
    await page.goto('/operations/inbox')
    await page.getByRole('navigation', { name: 'Inbox' }).getByRole('link', { name: 'Waiting on others · 2' }).click()
    await expect(page.getByRole('list', { name: 'Waiting on others' }).getByRole('listitem')).toHaveCount(2)
  })
})
