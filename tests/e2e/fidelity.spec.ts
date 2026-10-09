import { expect, test, type Page } from '@playwright/test'

/** Drift from the frames found in the Phase 9 visual sweep (R11); each test pins the frame's detail. */

async function viewAs(page: Page, name: string) {
  await page.goto('/operations')
  await page.getByRole('button', { name: /^Viewing as/ }).click()
  await page.getByRole('menuitem', { name: new RegExp(`^${name.replace('.', '\\.')}`) }).click()
}

test('6d: a paused agent’s activities read as paused chips, with what was routed, and no edit-rate column', async ({ page }) => {
  await page.goto('/operations/agents/med-rec?scenario=resume-requested')
  const table = page.getByRole('table', { name: 'Activities' })
  await expect(table.locator('[data-status="paused"]').first()).toHaveText('Paused · was Draft')
  await expect(table.getByText('96 drafts · 12 routed')).toBeVisible()
  await expect(table.getByRole('columnheader', { name: /Edit rate/ })).toHaveCount(0)
})

test('2d: a privilege at Shadow carries the Shadow chip', async ({ page }) => {
  await viewAs(page, 'Dana')
  await page.goto('/inventory/agents/med-rec?scenario=review-decided')
  const privileges = page.getByRole('table', { name: 'Privileges' })
  await expect(privileges.locator('[data-status="shadow"]').first()).toHaveText('Shadow from 15 Oct')
})

test('3b: each line’s result is marked: a check for agrees, warning chips for the misses', async ({ page }) => {
  await page.goto('/operations/agents/med-rec/cases/enc-4105?scenario=shadow-day-21')
  await expect(page.locator('[data-status="warn"]', { hasText: /^Inaccurate · name$/ })).toBeVisible()
  await expect(page.locator('[data-status="warn"]', { hasText: /^Omitted$/ })).toBeVisible()
  const agrees = page.getByRole('cell').filter({ hasText: /^Agrees$/ }).first()
  await expect(agrees.locator('svg')).toHaveCount(1)
})

test('3c: hard stops are listed as rule tags with their names', async ({ page }) => {
  await viewAs(page, 'Priya')
  await page.goto('/inventory/privileges/prv-0142/sign?scenario=awaiting-signature')
  await expect(page.getByText('HS-04 v1', { exact: true })).toBeVisible()
  await expect(page.getByText('Never change a dose', { exact: true })).toBeVisible()
})

test('7b: read only carries its lock, and each policy decision its mark', async ({ page }) => {
  await viewAs(page, 'Jordan')
  await page.goto('/operations/actions/act-88213')
  await expect(page.getByText(/^Read only · risk manager$/).locator('svg')).toHaveCount(1)
  for (const rule of ['HS-11 v1', 'HS-04 v2', 'HS-07 v1']) {
    const row = page.getByText(rule, { exact: true }).locator('xpath=..')
    await expect(row.locator('svg'), rule).toHaveCount(1)
  }
})

test('7d and 2b: format and tier are a segmented choice, not radio cards', async ({ page }) => {
  await viewAs(page, 'Dana')
  await page.goto('/reports/export?agent=med-rec')
  const format = page.getByRole('group', { name: 'Format' })
  await expect(format.getByRole('button', { name: /PDF packet and CSV/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('radiogroup', { name: 'Format' })).toHaveCount(0)

  await page.goto('/inventory/agents/med-rec/risk-tier?scenario=review-risk-tier')
  const tier = page.getByRole('group', { name: 'Tier' })
  await expect(tier.getByRole('button', { name: /Tier 2 · Moderate/ })).toHaveAttribute('aria-pressed', 'true')
  await tier.getByRole('button', { name: /Tier 3 · High/ }).click()
  await expect(tier.getByRole('button', { name: /Tier 3 · High/ })).toHaveAttribute('aria-pressed', 'true')
})

test('8c and 4c: the record reads "3 drafts held", and a paused agent’s chip fits its column', async ({ page }) => {
  await viewAs(page, 'Dana')
  await page.goto('/inventory')
  const table = page.getByRole('table', { name: 'Agents' })
  const priorAuth = table.locator('[data-row-id="prior-auth"]')
  await expect(priorAuth.locator('[data-status="crit"]')).toHaveText('Wrong-patient draft')
  const fits = await priorAuth.locator('[data-status="crit"]').evaluate((chip) => {
    const cell = chip.closest('[role="cell"]')!
    return chip.getBoundingClientRect().right <= cell.getBoundingClientRect().right + 0.5
  })
  expect(fits).toBe(true)
  await expect(table.locator('[data-row-id="med-rec"] [data-status="review"]')).toHaveText('Review: 3 drafts held')

  await page.goto('/operations/agents/med-rec')
  await expect(page.locator('main [data-status="review"]').first()).toHaveText('Review: 3 drafts held')
})

test('14a: signing a promotion stays blocked until there is a reason and the box is ticked', async ({ page }) => {
  await viewAs(page, 'Priya')
  await page.goto('/inventory/promotions/prm-0007')
  const sign = page.getByRole('button', { name: 'Sign and send to the board' })
  await expect(sign).toHaveAttribute('aria-disabled', 'true')
  await page.getByRole('textbox', { name: /Reason/ }).fill('Ninety days of evidence; every criterion met.')
  await expect(sign).toHaveAttribute('aria-disabled', 'true')
  await page.getByRole('checkbox', { name: /I accept accountability/ }).check()
  await expect(sign).not.toHaveAttribute('aria-disabled', 'true')
})

test('11a: 6 North’s trends are grey, the rising independent check amber, with no end dots', async ({ page }) => {
  await page.goto('/operations/reviewers')
  const weekly = page.getByRole('region', { name: '6 North · weekly' })
  const strokes = await weekly.locator('svg path').evaluateAll((paths) => paths.map((p) => getComputedStyle(p).stroke))
  const colour = (token: string) =>
    page.evaluate((t) => {
      const probe = document.createElement('span')
      probe.style.color = `var(${t})`
      document.body.append(probe)
      const c = getComputedStyle(probe).color
      probe.remove()
      return c
    }, token)
  expect(strokes).toEqual([await colour('--cs-text2'), await colour('--cs-text2'), await colour('--cs-warn-text')])
  await expect(weekly.locator('svg circle')).toHaveCount(0)
})
