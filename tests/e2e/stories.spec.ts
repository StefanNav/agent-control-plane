import { expect, test, type Page } from '@playwright/test'
import { personaById } from '../../src/prototype/personas'
import { STORIES, stepHref } from '../../src/prototype/stories'
import { collectErrors } from './console'

const panel = (page: Page) => page.getByRole('complementary', { name: 'Story' })

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
      if (step.target)
        await expect(page.locator(`[data-story-target="${step.target}"]`), step.title).toBeVisible()
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
