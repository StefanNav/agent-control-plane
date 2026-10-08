import { expect, test } from '@playwright/test'
import { collectErrors } from './console'

test('find the one problem among 20 (Marcus): board → division → agent → inbox → dismiss', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/operations')
  await page.getByRole('table', { name: 'Divisions' }).getByText('Medications').click()
  const panel = page.getByRole('complementary', { name: 'Selected division' })
  await expect(panel).toContainText('Marcus · 20 agents · 4 need a human')
  await panel.getByRole('link', { name: 'Open division' }).click()

  const rows = page.locator('[data-row-id]')
  await expect(rows.first()).toContainText('Med Rec Agent')
  await expect(rows.first()).toContainText('Review: 3 drafts')
  await page.getByRole('complementary', { name: 'Selected agent' }).getByRole('link', { name: 'Med Rec Agent' }).click()
  await expect(page).toHaveURL(/\/operations\/agents\/med-rec/)
  await expect(page.getByText('3 drafts held by HS-04 v2 need a pharmacist decision.')).toBeVisible()

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Operations' }).click()
  await page.getByRole('navigation', { name: 'Operations' }).getByRole('link', { name: 'Inbox · 4' }).click()
  await page.getByRole('link', { name: /Edit rate rising/ }).click()
  await page.getByRole('button', { name: 'Dismiss…' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: 'Reason' }).fill('Formulary update F-112 explains the edits.')
  await dialog.getByRole('button', { name: 'Dismiss with reason' }).click()
  await expect(page.getByRole('navigation', { name: 'Inbox' }).getByRole('link', { name: 'Needs me · 3' })).toBeVisible()

  // Dismissing closes the exception; the agent's judgment (edit rate still 19.2 %) is unchanged,
  // so Medications still has 4 agents needing a human. This is the designed behaviour.
  await page.goto('/operations')
  await page.getByRole('table', { name: 'Divisions' }).getByText('Medications').click()
  await expect(page.getByRole('complementary', { name: 'Selected division' })).toContainText('4 need a human')
  expect(errors).toEqual([])
})

test('stop easy, resume deliberate: Marcus pauses, Priya approves, Jordan reconstructs', async ({ page }) => {
  const errors = collectErrors(page)
  const viewAs = async (name: string) => {
    await page.getByRole('button', { name: /^Viewing as/ }).click()
    await page.getByRole('menuitem', { name: new RegExp(name) }).click()
  }

  // Marcus pauses from the division panel; every view agrees.
  await page.goto('/operations/divisions/medications')
  await page.getByRole('complementary', { name: 'Selected agent' }).getByRole('link', { name: 'Pause agent' }).click()
  const pause = page.getByRole('dialog', { name: 'Pause Med Rec Agent?' })
  await pause.getByRole('textbox', { name: /Reason/ }).fill('HS-04 blocked 3 dose changes since 09:00.')
  await pause.getByRole('button', { name: 'Pause agent' }).click()
  await expect(page.getByText('Paused by Marcus at 09:52.')).toBeVisible()
  await page.goto('/operations/divisions/medications')
  await expect(page.locator('[data-row-id="med-rec"]')).toContainText('Paused by Marcus')

  // Marcus asks to resume and can't approve that same request.
  await page.goto('/operations/agents/med-rec')
  const panel = page.getByRole('region', { name: 'Resume' })
  await panel.getByRole('textbox', { name: /Reason/ }).fill('Dose mapping fixed in SOP v1.3.2; replayed clean.')
  await panel.getByRole('button', { name: 'Request resume' }).click()
  await expect(panel).toContainText('Stays paused until Priya approves.')
  await expect(panel.getByRole('button', { name: 'Resume' })).toHaveAttribute('aria-disabled', 'true')

  // Priya approves with a reason of Priya's own; the agent is back at Draft.
  await viewAs('Priya')
  await page.goto('/operations/agents/med-rec')
  await panel.getByRole('textbox', { name: /Your reason/ }).fill('Root cause fixed and replayed clean.')
  await panel.getByRole('button', { name: 'Approve and resume' }).click()
  await expect(page.locator('[data-row-id="med-rec-admission"]')).toContainText('Draft')
  await expect(page.getByRole('button', { name: 'Controls' })).toBeVisible()
  await page.goto('/wall')
  await expect(page.getByText(/2 pauses/)).toBeVisible()

  // Jordan replays the blocked action and opens an incident from it.
  await page.goto('/operations/actions')
  await viewAs('Jordan')
  await page.goto('/operations/actions/act-88213')
  await page.getByRole('button', { name: 'Open incident' }).click()
  await page.getByRole('dialog', { name: 'Open an incident' }).getByRole('button', { name: 'Open incident' }).click()
  await expect(page.getByRole('table', { name: 'Linked actions' })).toContainText('ACT-88213')
  expect(errors).toEqual([])
})
