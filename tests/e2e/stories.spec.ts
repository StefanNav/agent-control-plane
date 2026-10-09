import { expect, test, type Page } from '@playwright/test'
import { personaById } from '../../src/prototype/personas'
import { STORIES, stepHref } from '../../src/prototype/stories'
import { collectErrors } from './console'

const panel = (page: Page) => page.getByRole('complementary', { name: 'Story' })

/** The step's screen: its target, or for a dialog step, the dialog (Review focus 1). */
async function expectStepScreen(page: Page, step: (typeof STORIES)[number]['steps'][number]) {
  if (step.target)
    await expect(page.locator(`[data-story-target="${step.target}"]`), step.title).toBeVisible()
  else await expect(page.getByRole('dialog'), step.title).toBeVisible()
}

/** The panel never sits on the target, unless the target is too tall to fit above it. */
async function expectClearOfPanel(page: Page, target: string) {
  await expect
    .poll(
      async () => {
        const t = await page.locator(`[data-story-target="${target}"]`).first().boundingBox()
        const p = await panel(page).boundingBox()
        if (!t || !p) return 'not rendered'
        const overlap =
          t.x < p.x + p.width && t.x + t.width > p.x && t.y < p.y + p.height && t.y + t.height > p.y
        return !overlap || t.height > p.y - 32
          ? 'clear'
          : `covered (${Math.round(t.y + t.height)} > ${Math.round(p.y)})`
      },
      { message: target },
    )
    .toBe('clear')
}

for (const story of STORIES) {
  const name = personaById(story.personaId).name

  test(`${name}’s story runs from step 1 to the end`, async ({ page }) => {
    test.setTimeout(60_000)
    const errors = collectErrors(page)
    await page.goto(stepHref(story, 1))
    for (const [i, step] of story.steps.entries()) {
      await expect(panel(page)).toContainText(`Step ${i + 1} of ${story.steps.length}`)
      await expect(panel(page).getByRole('heading', { name: step.title })).toBeVisible()
      await expect(
        page.getByRole('button', { name: new RegExp(`^Viewing as ${name}`) }),
      ).toBeVisible()
      await expectStepScreen(page, step)
      const last = i === story.steps.length - 1
      await panel(page)
        .getByRole('button', { name: last ? 'Finish' : 'Next' })
        .click()
    }
    await expect(panel(page)).toHaveCount(0)
    expect(new URL(page.url()).searchParams.has('story')).toBe(false)
    expect(errors).toEqual([])
  })
}

for (const story of STORIES) {
  const name = personaById(story.personaId).name

  test(`a shared link opens any step of ${name}’s story`, async ({ page }) => {
    test.setTimeout(90_000)
    const errors = collectErrors(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    for (const [i, step] of story.steps.entries()) {
      // A fresh visitor every time: no saved hospital, no saved story.
      await page.goto('/about')
      await page.evaluate(() => localStorage.clear())
      await page.goto(stepHref(story, i + 1))
      await expect(panel(page).getByRole('heading', { name: step.title })).toBeVisible()
      await expect(
        page.getByRole('button', { name: new RegExp(`^Viewing as ${name}`) }),
      ).toBeVisible()
      await expectStepScreen(page, step)
      if (step.target) await expectClearOfPanel(page, step.target)
    }
    expect(errors).toEqual([])
  })
}

test('Review focus 4: an unknown story is ignored, an out-of-range step is clamped', async ({
  page,
}) => {
  await page.goto('/operations?story=nope&step=2')
  await expect(page.getByRole('heading', { level: 1, name: 'Lakeshore Health' })).toBeVisible()
  await expect(page).not.toHaveURL(/story=/)
  await expect(panel(page)).toHaveCount(0)

  await page.goto('/operations?story=marcus&step=99')
  await expect(panel(page)).toContainText('Step 9 of 9')
  await expect(page).toHaveURL(/story=marcus&step=9$/)
})

test('the visitor’s own pause is kept, and a refresh keeps the step and the changes', async ({
  page,
}) => {
  const errors = collectErrors(page)
  const marcus = STORIES.find((s) => s.id === 'marcus')!
  await page.goto(stepHref(marcus, 5))
  await page.getByRole('button', { name: 'Dismiss…' }).click()
  const dismiss = page.getByRole('dialog')
  await dismiss
    .getByRole('textbox', { name: 'Reason' })
    .fill('Formulary update F-112 explains the edits.')
  await dismiss.getByRole('button', { name: 'Dismiss with reason' }).click()
  await panel(page).getByRole('button', { name: 'Next' }).click()

  const pause = page.getByRole('dialog', { name: 'Pause Med Rec Agent?' })
  await pause
    .getByRole('textbox', { name: /Reason/ })
    .fill('HS-04 blocked 3 dose changes since 09:00.')
  await pause.getByRole('button', { name: 'Pause agent' }).click()
  await panel(page).getByRole('button', { name: 'Next' }).click()

  await expect(panel(page)).toContainText('Step 7 of 9')
  await expect(page.getByText(/^Paused by Marcus at 09:52\./)).toBeVisible()
  await page.reload()
  await expect(panel(page)).toContainText('Step 7 of 9')
  await expect(page.getByText(/^Paused by Marcus at 09:52\./)).toBeVisible()
  // The dismissal from step 5 survived too.
  await page.goto('/operations/inbox/exc-5512')
  await expect(page.getByText('Dismissed by Marcus at 09:52.')).toBeVisible()
  await expect(panel(page)).toContainText('Step 7 of 9')
  expect(errors).toEqual([])
})

test('wandering off keeps the story; Next brings the visitor back as its person; Exit stays put', async ({
  page,
}) => {
  const marcus = STORIES.find((s) => s.id === 'marcus')!
  await page.goto(stepHref(marcus, 3))
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Inventory' })
    .click()
  await expect(page).toHaveURL(/\/inventory\?story=marcus&step=3$/)
  await expect(panel(page)).toContainText('You’ve left this step.')

  await page.getByRole('button', { name: /^Viewing as/ }).click()
  await page.getByRole('menuitem', { name: /^Jordan/ }).click()
  await expect(page).toHaveURL(/\/operations\/actions\?story=marcus&step=3$/)
  await expect(panel(page)).toContainText('Step 3 of 9')

  await panel(page).getByRole('button', { name: 'Next' }).click()
  await expect(page).toHaveURL(/\/operations\/inbox\?story=marcus&step=4$/)
  await expect(page.getByRole('button', { name: /^Viewing as Marcus/ })).toBeVisible()

  await panel(page).getByRole('button', { name: 'Exit' }).click()
  await expect(panel(page)).toHaveCount(0)
  await expect(page).toHaveURL(/\/operations\/inbox$/)
  await page.reload()
  await expect(panel(page)).toHaveCount(0)
})

test('Back after Exit doesn’t restart the story or undo what the visitor did', async ({ page }) => {
  const marcus = STORIES.find((s) => s.id === 'marcus')!
  await page.goto(stepHref(marcus, 5))
  await page.getByRole('button', { name: 'Dismiss…' }).click()
  const dismiss = page.getByRole('dialog')
  await dismiss
    .getByRole('textbox', { name: 'Reason' })
    .fill('Formulary update F-112 explains the edits.')
  await dismiss.getByRole('button', { name: 'Dismiss with reason' }).click()
  await panel(page).getByRole('button', { name: 'Next' }).click()
  await expect(panel(page)).toContainText('Step 6 of 9')
  await panel(page).getByRole('button', { name: 'Exit' }).click()
  await expect(panel(page)).toHaveCount(0)

  await page.goBack()
  await expect(page).not.toHaveURL(/story=/)
  await expect(panel(page)).toHaveCount(0)
  await page.goto('/operations/inbox/exc-5512')
  await expect(page.getByText('Dismissed by Marcus at 09:52.')).toBeVisible()
  await expect(panel(page)).toHaveCount(0)
})
