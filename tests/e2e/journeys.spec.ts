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

test('intake to signed privilege: Dana → Marcus → Sam → Priya → Dana → Dr. Lee → (21 days) → Marcus → Priya', async ({ page }) => {
  test.setTimeout(60_000)
  const errors = collectErrors(page)
  const viewAs = async (name: string) => {
    await page.getByRole('button', { name: /^Viewing as/ }).click()
    await page.getByRole('menuitem', { name: new RegExp(name) }).click()
  }
  const onboarding = (step: string) => page.goto(`/inventory/agents/med-rec/onboarding/${step}`)

  // Dana starts from the approved intake with all four humans named (1a, 2a).
  await page.goto('/inventory')
  await viewAs('Dana')
  await page.goto('/inventory/agents/med-rec/onboarding/intake?scenario=onboarding-intake')
  await page.getByLabel('Technical owner').selectOption('sam')
  await page.getByRole('button', { name: 'Start onboarding' }).click()
  await expect(page).toHaveURL(/onboarding\/job$/)

  // Marcus writes the job description (1b).
  await viewAs('Marcus')
  await onboarding('job')
  for (const name of ['Reconcile home medications at admission', 'Flag allergy conflicts']) {
    await page.getByRole('button', { name: '+ Add activity' }).click()
    await page.getByRole('textbox', { name: /What the activity does/ }).fill(name)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
  }
  for (const item of ['Change a dose', 'Remove an allergy', 'Draft for anyone but the encounter’s patient']) {
    await page.getByRole('button', { name: '+ Add a never item' }).click()
    await page.getByRole('textbox', { name: /In plain words/ }).fill(item)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
  }
  await page.getByRole('combobox', { name: 'Acting for' }).selectOption('The admitting pharmacist on the patient’s unit')
  await page.getByRole('button', { name: '+ Patient on dialysis' }).click()
  for (const [label, value] of [
    ['Agreement with the pharmacist’s list target, %', '90'],
    ['Omitted home medications target, %', '3'],
    ['Inaccurate lines target, %', '2'],
  ] as const) {
    await page.getByRole('textbox', { name: label }).fill(value)
    await page.getByRole('textbox', { name: label }).blur()
  }
  await expect(page.getByRole('heading', { name: 'Job description · 7 of 7' })).toBeVisible()

  // Marcus grants only what the activities need, each with its reason (1c).
  await onboarding('systems')
  for (const cell of ['Epic · read', 'Epic · draft', 'Pharmacy worklist · read', 'Pharmacy worklist · write', 'Pyxis · read', 'Microsoft Teams · write']) {
    await page.getByRole('button', { name: cell, exact: true }).click()
  }
  for (const [label, value] of [
    ['Epic · read', 'all'],
    ['Epic · draft', 'med-rec-a1'],
    ['Pharmacy worklist · write', 'med-rec-a1'],
    ['Pyxis · read', 'med-rec-a1'],
    ['Teams · write', 'escalation'],
  ] as const) {
    await page.getByRole('combobox', { name: `${label}: the activity it serves` }).selectOption(value)
  }
  await expect(page.getByRole('heading', { name: 'Systems and verbs · done' })).toBeVisible()

  // Sam tests the three hard stops and sends the set (1d).
  await viewAs('Sam')
  await onboarding('tools')
  while ((await page.getByRole('button', { name: 'Run test' }).count()) > 0) await page.getByRole('button', { name: 'Run test' }).first().click()
  await page.getByRole('button', { name: 'Send to Priya for approval' }).click()

  // Priya finds it in her inbox and approves the set (1e).
  await viewAs('Priya')
  await page.goto('/operations/inbox')
  await page.getByRole('link', { name: /Review: final set/ }).click()
  await page.getByRole('link', { name: 'Open the final set' }).click()
  await page.getByRole('button', { name: 'Approve and sign' }).click()
  await expect(page.getByText('AGT-0123 · v1.0 · frozen')).toBeVisible()

  // Dana sets Tier 3 with a reason and builds the packet (2b).
  await viewAs('Dana')
  await page.goto('/inventory/agents/med-rec/risk-tier')
  await page.getByRole('radio', { name: /Tier 3 · High/ }).click()
  await page.getByRole('textbox', { name: /Reason for changing the suggested tier/ }).fill('Med rec errors carry into every inpatient order.')
  await page.getByRole('button', { name: 'Set Tier 3 and build the packet' }).click()

  // Dr. Lee approves with conditions; shadow starts the next day (2c, 2d).
  await viewAs('Dr. Lee')
  await page.goto('/portfolio/reviews/med-rec')
  await page.getByRole('textbox', { name: 'Reason' }).fill('Clear limits and good hard-stop evidence.')
  await page.getByRole('button', { name: 'Record decision' }).click()
  await expect(page.getByRole('table', { name: 'Privileges' })).toContainText('Shadow from 02 Oct')

  // Shadow takes 21 days: skip ahead, as the Phase 8 story will (3a).
  await viewAs('Marcus')
  await page.goto('/operations/agents/med-rec?tab=scorecard&scenario=shadow-day-21')
  await page.getByRole('button', { name: 'Ask Priya to sign' }).click()
  await expect(page.getByText('Requested · waiting for Priya')).toBeVisible()

  // Priya signs below target with a written reason (3c), and it shows in My privileges (3d).
  await viewAs('Priya')
  await page.goto('/inventory/privileges/prv-0142/sign')
  await page.getByRole('textbox', { name: 'Reason for signing below target' }).fill('Name mismatches are fixed in SOP v1.3.1; a pharmacist signs every draft (C1).')
  await page.getByRole('checkbox', { name: /I accept accountability/ }).click()
  await page.getByRole('button', { name: 'Sign and move to Draft' }).click()
  await page.goto('/portfolio/privileges')
  await expect(page.locator('[data-row-id]').filter({ hasText: 'Med Rec Agent' })).toContainText('In 91 days')
  expect(errors).toEqual([])
})

async function viewPersona(page: import('@playwright/test').Page, name: string) {
  await page.getByRole('button', { name: /^Viewing as/ }).click()
  await page.getByRole('menuitem', { name: new RegExp(`^${name}`) }).click()
}

test('flag it where you work (Ana): flag from Epic → v1.5.0 held → re-validated → "Your flag led to a fix"', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/operations')
  await viewPersona(page, 'Ana')
  await page.getByRole('button', { name: 'Flag a problem' }).click()
  await page.getByLabel('Add a note (optional)').fill('Frequency split into two lines')
  await page.getByRole('button', { name: 'Send flag' }).click()
  await expect(page.getByText('Flag FB-2291 sent to Marcus.', { exact: false })).toBeVisible()

  await viewPersona(page, 'Marcus')
  await page.goto('/operations/inbox')
  await expect(page.getByText('Flag from Epic').first()).toBeVisible()

  // The time skip: a week later Sam deploys v1.5.0 (the Phase 8 story loads this scenario too).
  await page.goto('/operations/agents/med-rec?tab=changes&scenario=change-detected-v150')
  await expect(page.getByText('v1.5.0 held at the gateway')).toBeVisible()
  await page.getByRole('button', { name: 'Start replay' }).click()
  await page.getByRole('button', { name: 'Sign off' }).click()

  await viewPersona(page, 'Priya')
  await page.goto('/operations/agents/med-rec?tab=changes')
  await page.getByRole('button', { name: 'Approve', exact: true }).click()

  await viewPersona(page, 'Marcus')
  await page.goto('/operations/agents/med-rec?tab=changes')
  await page.getByRole('button', { name: 'Accept v1.5.0' }).click()
  await expect(page.getByText('v1.5.0 · SOP v1.5 · AGT-0123')).toBeVisible()

  await viewPersona(page, 'Ana')
  const fix = page.getByRole('region', { name: 'Your flag led to a fix' })
  await expect(fix).toContainText('FB-2291 Frequency split into two lines')
  await expect(fix).toContainText('5 other pharmacists flagged the same thing.')
  expect(errors).toEqual([])
})

test('access follows accountability (Dana): Sam gets Discharge, can act there, then loses it again', async ({ page }) => {
  const errors = collectErrors(page)
  const revoke = () => page.getByRole('menuitem', { name: /Revoke a tool…/ })
  await page.goto('/operations')
  await viewPersona(page, 'Dana')
  await page.goto('/settings/people?person=sam')
  await page.getByRole('combobox', { name: 'Division for Sam' }).selectOption({ label: 'Discharge' })
  await page.getByRole('button', { name: 'Add role' }).click()

  await viewPersona(page, 'Sam')
  await page.goto('/operations/agents/discharge-summary')
  await page.getByRole('button', { name: 'Controls' }).click()
  await expect(revoke()).not.toHaveAttribute('aria-disabled', 'true')
  await page.keyboard.press('Escape')

  await viewPersona(page, 'Dana')
  await page.goto('/settings/people?person=sam')
  await page.getByRole('button', { name: 'Remove Technical owner · Discharge' }).click()
  await expect(page.getByRole('complementary', { name: 'Sam' })).not.toContainText('Technical owner · Discharge')

  await viewPersona(page, 'Sam')
  await page.goto('/operations/agents/discharge-summary')
  await page.getByRole('button', { name: 'Controls' }).click()
  await expect(revoke()).toHaveAttribute('aria-disabled', 'true')
  expect(errors).toEqual([])
})
