import { expect, test } from '@playwright/test'
import { CHAPTERS } from '../../src/prototype/tour/script'
import { collectErrors } from './console'

test('the landing page offers the tour, seven stories and free explore', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Agent Control Plane' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Play the tour · \d+ min$/ })).toBeVisible()
  await expect(page.getByText('Narrated by Stefan')).toBeVisible()
  const photo = page.locator('img[src="/tour/stefan.jpg"]')
  await expect(photo).toBeVisible()
  expect(await photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBe(144)
  await expect(page.getByRole('heading', { level: 2, name: 'Or explore on your own' })).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(7)
  await page.getByRole('button', { name: 'Explore freely' }).click()
  await expect(page).toHaveURL(/\/operations\/divisions\/medications$/)
  await expect(page.getByRole('button', { name: /^Viewing as Marcus/ })).toBeVisible()
  expect(errors).toEqual([])
})

test('Play the tour opens the tour on its first chapter, playing', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/?tourVoice=silent')
  await page.getByRole('button', { name: /^Play the tour · \d+ min$/ }).click()
  await expect(page).toHaveURL(/\/operations\?tour=open$/)
  const bar = page.getByRole('complementary', { name: 'Tour' })
  await expect(bar.getByRole('button', { name: 'Pause tour' })).toBeVisible()
  // Playing at once, it needs no welcome.
  await expect(page.locator('[data-tour="welcome"]')).toHaveCount(0)
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
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('About this work')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText([
    ...CHAPTERS.filter((chapter) => chapter.id !== 'close').map((chapter) => chapter.title),
    'Principles',
    'Countersign, the design system',
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
  await expect(page.locator('[data-attune="mark"]')).toBeVisible()
})

test.describe('the Attune mark (Phase 11)', () => {
  test('welcomes once a session, then rests', async ({ page }) => {
    await page.goto('/')
    const mark = page.locator('[data-attune="welcome"]')
    await expect(mark).toHaveAttribute('aria-hidden', 'true')
    await expect(mark).toHaveAttribute('data-state', 'still', { timeout: 4000 })
    await page.reload()
    await expect(mark).toHaveAttribute('data-state', 'still')
  })

  test('under reduced motion the welcome is still from the start', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await expect(page.locator('[data-attune="welcome"]')).toHaveAttribute('data-state', 'still')
  })

  test('the prototype bar carries the still mark', async ({ page }) => {
    await page.goto('/operations')
    const bar = page.getByRole('region', { name: 'Prototype controls' })
    await expect(bar.locator('[data-attune="mark"]')).toBeVisible()
  })
})
