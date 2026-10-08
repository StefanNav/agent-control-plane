import { expect, test } from '@playwright/test'
import { collectErrors } from './console'

test.describe('hospital board (4a)', () => {
  test('divisions needing a human come first, with the selected division explained', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('/operations')
    await expect(page.getByText('2 divisions need a human')).toBeVisible()
    const rows = page.getByRole('table', { name: 'Divisions' }).locator('[data-row-id]')
    await expect(rows.first()).toContainText('Revenue cycle')
    await expect(rows.first()).toHaveAttribute('aria-selected', 'true')
    const panel = page.getByRole('complementary', { name: 'Selected division' })
    await expect(panel).toContainText('INC-0029 · open')
    await expect(panel).toContainText('needs Tom and Nina')
    expect(errors).toEqual([])
  })

  test('selecting a division updates the panel; Open division goes to it', async ({ page }) => {
    await page.goto('/operations')
    await page.getByRole('table', { name: 'Divisions' }).getByText('Medications').click()
    const panel = page.getByRole('complementary', { name: 'Selected division' })
    await expect(panel).toContainText('Marcus · 20 agents · 4 need a human')
    await panel.getByRole('link', { name: 'Open division' }).click()
    await expect(page).toHaveURL(/\/operations\/divisions\/medications/)
  })

  test('Needs a human filters out divisions that are fine', async ({ page }) => {
    await page.goto('/operations')
    await page.getByRole('button', { name: 'Needs a human · 2' }).click()
    const table = page.getByRole('table', { name: 'Divisions' })
    await expect(table.locator('[data-row-id]')).toHaveCount(2)
    await expect(table).not.toContainText('Discharge')
  })
})

test('tiles (4d): one square per agent, attention first', async ({ page }) => {
  await page.goto('/operations?view=tiles')
  await expect(page.locator('[data-agent-square]')).toHaveCount(41)
  await expect(page.locator('[data-tile]').first()).toContainText('Revenue cycle')
  await expect(page.getByText('Next deadline 10:46 · goes to Priya')).toBeVisible()
})

test('exceptions first (4f): five open exceptions, critical first', async ({ page }) => {
  await page.goto('/operations?view=exceptions')
  await expect(page.getByText('5 open exceptions across the hospital')).toBeVisible()
  const rows = page.getByRole('table', { name: 'Open exceptions' }).locator('[data-row-id]')
  await expect(rows).toHaveCount(5)
  await expect(rows.first()).toContainText('Wrong-patient draft')
  await expect(rows.nth(1)).toContainText('10:46 → Priya')
})

test('the view toggle switches layouts', async ({ page }) => {
  await page.goto('/operations')
  await page.getByRole('button', { name: 'Tiles' }).click()
  await expect(page).toHaveURL(/view=tiles/)
  await page.getByRole('button', { name: 'Exceptions first' }).click()
  await expect(page).toHaveURL(/view=exceptions/)
})

test.describe('division view (4b)', () => {
  test('Marcus sees his 20 agents, judgment first', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('/operations/divisions/medications')
    await expect(page.getByRole('heading', { level: 1, name: 'Medications' })).toBeVisible()
    await expect(page.getByText('20 agents · 4 need a human · owner Marcus · sponsor Priya')).toBeVisible()
    const rows = page.getByRole('table', { name: 'Medications agents' }).locator('[data-row-id]')
    await expect(rows).toHaveCount(20)
    await expect(rows.first()).toContainText('Med Rec Agent')
    await expect(rows.first()).toContainText('Review: 3 drafts')
    await expect(page.getByRole('table', { name: 'Medications agents' }).getByText('No data for 3h')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('selecting an agent fills the panel; Enter opens the agent', async ({ page }) => {
    await page.goto('/operations/divisions/medications')
    await page.getByRole('table', { name: 'Medications agents' }).getByText('Discharge Meds Agent').click()
    const panel = page.getByRole('complementary', { name: 'Selected agent' })
    await expect(panel).toContainText('Flag discharge interactions')
    await expect(panel).toContainText('1,964')
    await page.getByRole('table', { name: 'Medications agents' }).locator('[data-row-id="med-rec"]').focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/operations\/agents\/med-rec$/)
  })

  test('Work 4 exceptions goes to the inbox; unknown divisions are not found', async ({ page }) => {
    await page.goto('/operations/divisions/medications')
    await page.getByRole('link', { name: /Work 4 exceptions/ }).click()
    await expect(page).toHaveURL(/\/operations\/inbox/)
    await page.goto('/operations/divisions/nope')
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
  })
})
