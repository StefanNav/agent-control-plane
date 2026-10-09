import { expect, test } from '@playwright/test'
import { collectErrors } from './console'

test('the landing page offers seven stories and free explore', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Agent Control Plane' })).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(7)
  await page.getByRole('button', { name: 'Explore freely' }).click()
  await expect(page).toHaveURL(/\/operations\/divisions\/medications$/)
  await expect(page.getByRole('button', { name: /^Viewing as Marcus/ })).toBeVisible()
  expect(errors).toEqual([])
})

test('a card starts its story on the first screen', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Follow Jordan’s story →' }).click()
  await expect(page).toHaveURL(/\/operations\/actions\?story=jordan&step=1$/)
  await expect(page.getByRole('complementary', { name: 'Story' })).toContainText('Step 1 of 4')
})

test('About tells the case study and links to the components', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/about')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText([
    'What it is',
    'The problem',
    'Principles',
    'Countersign, the design system',
    'How to use it',
    'How it’s built',
  ])
  await page.getByRole('link', { name: 'See the components' }).click()
  await expect(page).toHaveURL(/\/about\/components$/)
  expect(errors).toEqual([])
})

test('below 1024 px the gate shows and nothing of the app runs', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 })
  await page.goto('/operations/agents/med-rec?control=pause-agent')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Best viewed on a desktop' }),
  ).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0)
})
